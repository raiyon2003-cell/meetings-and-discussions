import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { canReadMeeting, canReadDecision, canReadAction } from '../lib/access.js';

const router = Router();
router.use(authenticate);

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

    let meetingsQ = supabaseAdmin.from('meetings').select('*').limit(limit);
    let decisionsQ = supabaseAdmin.from('decisions').select('*').limit(limit);
    let actionsQ = supabaseAdmin.from('action_items').select('*').limit(limit);

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

    const actions = [];
    for (const a of actionsRaw || []) {
      let meeting;
      let decision;
      if (a.meeting_id) {
        const { data } = await supabaseAdmin.from('meetings').select('*').eq('id', a.meeting_id).maybeSingle();
        meeting = data;
      }
      if (a.decision_id) {
        const { data } = await supabaseAdmin.from('decisions').select('*').eq('id', a.decision_id).maybeSingle();
        decision = data;
      }
      if (canReadAction(profile, a, meeting, decision)) actions.push(a);
    }

    res.json({ meetings, decisions, actions });
  } catch (e) {
    next(e);
  }
});

export default router;
