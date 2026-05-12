import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { canReadMeeting, canReadDecision, canReadAction } from '../lib/access.js';

const router = Router();
router.use(authenticate);

const MEETING_SEARCH_COL = 'id,title,meeting_type,scheduled_at,status,department_id,division_id,owner_id';
const DECISION_SEARCH_COL = 'id,title,status,date_decided,department_id,division_id,owner_id,meeting_id';
const ACTION_SEARCH_COL = 'id,title,status,priority,due_date,meeting_id,decision_id,assigned_to';

const searchQuerySchema = z.object({
  keyword: z.string().optional(),
  division_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  project_client: z.string().optional(),
  meeting_type: z.string().optional(),
  decision_status: z.string().optional(),
  action_status: z.string().optional(),
  attendee_user_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().optional(),
});

router.get('/', validateQuery(searchQuerySchema), async (req, res, next) => {
  try {
    const q = req.validatedQuery;
    const limit = Math.min(50, q.limit || 25);
    const profile = req.profile;

    let meetingsQ = supabaseAdmin.from('meetings').select(MEETING_SEARCH_COL).limit(limit);
    let decisionsQ = supabaseAdmin.from('decisions').select(DECISION_SEARCH_COL).limit(limit);
    let actionsQ = supabaseAdmin.from('action_items').select(ACTION_SEARCH_COL).limit(limit);

    if (q.keyword) {
      meetingsQ = meetingsQ.or(
        `title.ilike.%${q.keyword}%,discussion_summary.ilike.%${q.keyword}%,key_discussion_points.ilike.%${q.keyword}%`,
      );
      decisionsQ = decisionsQ.or(`title.ilike.%${q.keyword}%,description.ilike.%${q.keyword}%`);
      actionsQ = actionsQ.or(`title.ilike.%${q.keyword}%,description.ilike.%${q.keyword}%`);
    }
    if (q.division_id) {
      meetingsQ = meetingsQ.eq('division_id', q.division_id);
      decisionsQ = decisionsQ.eq('division_id', q.division_id);
    }
    if (q.department_id) {
      meetingsQ = meetingsQ.eq('department_id', q.department_id);
      decisionsQ = decisionsQ.eq('department_id', q.department_id);
    }
    if (q.project_client) {
      meetingsQ = meetingsQ.ilike('related_project_client', `%${q.project_client}%`);
      decisionsQ = decisionsQ.ilike('related_project_client', `%${q.project_client}%`);
    }
    if (q.meeting_type) meetingsQ = meetingsQ.eq('meeting_type', q.meeting_type);
    if (q.decision_status) decisionsQ = decisionsQ.eq('status', q.decision_status);
    if (q.action_status) actionsQ = actionsQ.eq('status', q.action_status);
    if (q.date_from) {
      meetingsQ = meetingsQ.gte('scheduled_at', q.date_from);
      decisionsQ = decisionsQ.gte('date_decided', q.date_from);
      actionsQ = actionsQ.gte('due_date', q.date_from);
    }
    if (q.date_to) {
      meetingsQ = meetingsQ.lte('scheduled_at', q.date_to);
      decisionsQ = decisionsQ.lte('date_decided', q.date_to);
      actionsQ = actionsQ.lte('due_date', q.date_to);
    }
    if (q.attendee_user_id) {
      const { data: mids } = await supabaseAdmin
        .from('meeting_attendees')
        .select('meeting_id')
        .eq('user_id', q.attendee_user_id);
      const ids = (mids || []).map((r) => r.meeting_id);
      if (ids.length) meetingsQ = meetingsQ.in('id', ids);
      else meetingsQ = meetingsQ.eq('id', '00000000-0000-0000-0000-000000000000');
    }
    if (q.assigned_user_id) actionsQ = actionsQ.eq('assigned_to', q.assigned_user_id);

    const [{ data: meetingsRaw }, { data: decisionsRaw }, { data: actionsRaw }] = await Promise.all([
      meetingsQ,
      decisionsQ,
      actionsQ,
    ]);

    const meetings = (meetingsRaw || []).filter((m) => canReadMeeting(profile, m));
    const decisions = (decisionsRaw || []).filter((d) => canReadDecision(profile, d));

    const actionRows = actionsRaw || [];
    const mIds = [...new Set(actionRows.map((a) => a.meeting_id).filter(Boolean))];
    const dIds = [...new Set(actionRows.map((a) => a.decision_id).filter(Boolean))];

    const [mRes, dRes] = await Promise.all([
      mIds.length
        ? supabaseAdmin.from('meetings').select('id,department_id,owner_id,meeting_type').in('id', mIds)
        : Promise.resolve({ data: [] }),
      dIds.length
        ? supabaseAdmin.from('decisions').select('id,department_id').in('id', dIds)
        : Promise.resolve({ data: [] }),
    ]);

    const meetingMap = new Map((mRes.data || []).map((m) => [m.id, m]));
    const decisionMap = new Map((dRes.data || []).map((d) => [d.id, d]));

    const actions = [];
    for (const a of actionRows) {
      const meeting = a.meeting_id ? meetingMap.get(a.meeting_id) : null;
      const decision = a.decision_id ? decisionMap.get(a.decision_id) : null;
      if (canReadAction(profile, a, meeting, decision)) actions.push(a);
    }

    res.json({ meetings, decisions, actions });
  } catch (e) {
    next(e);
  }
});

export default router;
