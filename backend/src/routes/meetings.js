import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  canCreateMeeting,
  canFinalizeMeeting,
  canModifyMeeting,
  canReadMeeting,
  isManagement,
  isViewOnly,
  roleSlug,
  RoleSlug,
  canReadAll,
  sameDepartment,
} from '../lib/access.js';
import { logActivity } from '../lib/activity.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  meetingCreateSchema,
  meetingUpdateSchema,
  attendeeSchema,
} from '../validations/schemas.js';
import { meta, parsePagination } from '../utils/pagination.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

const listQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'finalized']).optional(),
  division_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  meeting_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(['scheduled_at', 'created_at', 'title']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

function scopeMeetingsQuery(q, profile) {
  if (canReadAll(profile)) return q;
  const slug = roleSlug(profile);
  if (slug === RoleSlug.ADMIN) return q;
  if (slug === RoleSlug.DEPARTMENT_HEAD || slug === RoleSlug.TEAM_MEMBER) {
    if (!profile.department_id) return q.eq('id', '00000000-0000-0000-0000-000000000000');
    return q.eq('department_id', profile.department_id);
  }
  if (slug === RoleSlug.PROJECT_MANAGER) {
    return q.or(
      `owner_id.eq.${profile.id},meeting_type.eq.project`,
    );
  }
  return q.eq('owner_id', profile.id);
}

router.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const q = req.validatedQuery;
    const { page, limit, offset } = parsePagination(q);
    const sortField = q.sort || 'scheduled_at';
    const order = q.order || 'desc';

    let query = supabaseAdmin
      .from('meetings')
      .select('id,title,meeting_type,scheduled_at,status,department_id,division_id,owner_id,created_at', { count: 'exact' })
      .order(sortField, { ascending: order === 'asc', nullsFirst: false });

    query = scopeMeetingsQuery(query, req.profile);

    if (q.search) {
      query = query.ilike('title', `%${q.search}%`);
    }
    if (q.status) query = query.eq('status', q.status);
    if (q.division_id) query = query.eq('division_id', q.division_id);
    if (q.department_id) query = query.eq('department_id', q.department_id);
    if (q.meeting_type) query = query.eq('meeting_type', q.meeting_type);
    if (q.date_from) query = query.gte('scheduled_at', q.date_from);
    if (q.date_to) query = query.lte('scheduled_at', q.date_to);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw httpError(400, error.message);

    const filtered = (data || []).filter((m) => canReadMeeting(req.profile, m));

    res.json({
      data: filtered,
      meta: meta(count ?? filtered.length, page, limit),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data: meeting, error } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !meeting) throw httpError(404, 'Meeting not found');
    if (!canReadMeeting(req.profile, meeting)) throw httpError(403, 'Forbidden');

    const [{ data: attendees }, { data: decisions }, { data: actions }, { data: attachments }, { data: logs }] =
      await Promise.all([
        supabaseAdmin.from('meeting_attendees').select('*').eq('meeting_id', meeting.id),
        supabaseAdmin.from('decisions').select('*').eq('meeting_id', meeting.id),
        supabaseAdmin.from('action_items').select('*').eq('meeting_id', meeting.id),
        supabaseAdmin
          .from('attachments')
          .select('*')
          .eq('entity_type', 'meeting')
          .eq('entity_id', meeting.id),
        supabaseAdmin
          .from('activity_logs')
          .select('*')
          .eq('entity_type', 'meeting')
          .eq('entity_id', meeting.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

    const userIds = new Set();
    (attendees || []).forEach((a) => userIds.add(a.user_id));
    meeting.owner_id && userIds.add(meeting.owner_id);
    meeting.created_by && userIds.add(meeting.created_by);

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', [...userIds]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    res.json({
      meeting,
      attendees: attendees || [],
      attendee_profiles: profileMap,
      decisions: decisions || [],
      action_items: actions || [],
      attachments: attachments || [],
      activity: logs || [],
    });
  } catch (e) {
    next(e);
  }
});

router.post('/', validateBody(meetingCreateSchema), async (req, res, next) => {
  try {
    const body = req.validatedBody;
    if (isViewOnly(req.profile) || isManagement(req.profile)) {
      throw httpError(403, 'Forbidden');
    }
    if (!canCreateMeeting(req.profile, body.department_id)) {
      throw httpError(403, 'Cannot create meeting for this department');
    }

    const insert = {
      ...body,
      created_by: req.profile.id,
      updated_by: req.profile.id,
      status: body.status || 'draft',
      online_meeting_link: body.online_meeting_link || null,
    };

    const { data, error } = await supabaseAdmin.from('meetings').insert(insert).select('*').single();
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'meeting',
      entityId: data.id,
      action: 'created',
      userId: req.profile.id,
      metadata: { title: data.title },
    });

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validateBody(meetingUpdateSchema), async (req, res, next) => {
  try {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (exErr || !existing) throw httpError(404, 'Meeting not found');
    if (!canModifyMeeting(req.profile, existing)) throw httpError(403, 'Forbidden');
    if (isViewOnly(req.profile) || isManagement(req.profile)) throw httpError(403, 'Forbidden');

    const patch = {
      ...req.validatedBody,
      updated_by: req.profile.id,
    };

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'meeting',
      entityId: data.id,
      action: 'updated',
      userId: req.profile.id,
      metadata: { fields: Object.keys(req.validatedBody) },
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('meetings').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Meeting not found');
    if (!canModifyMeeting(req.profile, existing)) throw httpError(403, 'Forbidden');
    if (roleSlug(req.profile) !== RoleSlug.ADMIN && roleSlug(req.profile) !== RoleSlug.DEPARTMENT_HEAD) {
      throw httpError(403, 'Only admin or department head can delete meetings');
    }

    const { error } = await supabaseAdmin.from('meetings').delete().eq('id', req.params.id);
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'meeting',
      entityId: existing.id,
      action: 'deleted',
      userId: req.profile.id,
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.post('/:id/finalize', async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('meetings').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Meeting not found');
    if (!canFinalizeMeeting(req.profile, existing)) throw httpError(403, 'Forbidden');

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .update({
        status: 'finalized',
        finalized_by: req.profile.id,
        finalized_at: new Date().toISOString(),
        updated_by: req.profile.id,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'meeting',
      entityId: data.id,
      action: 'finalized',
      userId: req.profile.id,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

const attendeesBodySchema = z.object({
  attendees: z.array(attendeeSchema),
});

router.put('/:id/attendees', validateBody(attendeesBodySchema), async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('meetings').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Meeting not found');
    if (!canModifyMeeting(req.profile, existing)) throw httpError(403, 'Forbidden');

    await supabaseAdmin.from('meeting_attendees').delete().eq('meeting_id', req.params.id);

    const rows = req.validatedBody.attendees.map((a) => ({
      meeting_id: req.params.id,
      user_id: a.user_id,
      status: a.status || 'present',
      notes: a.notes || null,
    }));

    if (rows.length) {
      const { error } = await supabaseAdmin.from('meeting_attendees').insert(rows);
      if (error) throw httpError(400, error.message);
    }

    await logActivity({
      entityType: 'meeting',
      entityId: req.params.id,
      action: 'attendees_updated',
      userId: req.profile.id,
    });

    const { data: attendees } = await supabaseAdmin
      .from('meeting_attendees')
      .select('*')
      .eq('meeting_id', req.params.id);

    res.json({ attendees: attendees || [] });
  } catch (e) {
    next(e);
  }
});

export default router;
