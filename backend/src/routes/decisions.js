import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  canCreateDecision,
  canManageDecision,
  canReadDecision,
  isManagement,
  isViewOnly,
  roleSlug,
  RoleSlug,
  canReadAll,
} from '../lib/access.js';
import { logActivity } from '../lib/activity.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  decisionCreateSchema,
  decisionUpdateSchema,
  decisionStatusSchema,
} from '../validations/schemas.js';
import { meta, parsePagination } from '../utils/pagination.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

const listQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  division_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  meeting_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

function scopeDecisionsQuery(q, profile) {
  if (canReadAll(profile)) return q;
  if (roleSlug(profile) === RoleSlug.ADMIN) return q;
  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD || roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
    if (!profile.department_id) return q.eq('id', '00000000-0000-0000-0000-000000000000');
    return q.eq('department_id', profile.department_id);
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return q;
  }
  return q.or(`owner_id.eq.${profile.id}`);
}

router.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const q = req.validatedQuery;
    const { page, limit, offset } = parsePagination(q);

    let query = supabaseAdmin
      .from('decisions')
      .select('id,title,status,date_decided,department_id,division_id,owner_id,meeting_id,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    query = scopeDecisionsQuery(query, req.profile);

    if (q.search) query = query.ilike('title', `%${q.search}%`);
    if (q.status) query = query.eq('status', q.status);
    if (q.division_id) query = query.eq('division_id', q.division_id);
    if (q.department_id) query = query.eq('department_id', q.department_id);
    if (q.meeting_id) query = query.eq('meeting_id', q.meeting_id);
    if (q.date_from) query = query.gte('date_decided', q.date_from);
    if (q.date_to) query = query.lte('date_decided', q.date_to);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw httpError(400, error.message);

    const filtered = (data || []).filter((d) => canReadDecision(req.profile, d));

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
    const { data: decision, error } = await supabaseAdmin
      .from('decisions')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !decision) throw httpError(404, 'Decision not found');
    if (!canReadDecision(req.profile, decision)) throw httpError(403, 'Forbidden');

    const [{ data: meeting }, { data: actions }, { data: attachments }, { data: history }] =
      await Promise.all([
        decision.meeting_id
          ? supabaseAdmin.from('meetings').select('*').eq('id', decision.meeting_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseAdmin.from('action_items').select('*').eq('decision_id', decision.id),
        supabaseAdmin
          .from('attachments')
          .select('*')
          .eq('entity_type', 'decision')
          .eq('entity_id', decision.id),
        supabaseAdmin
          .from('decision_status_history')
          .select('*')
          .eq('decision_id', decision.id)
          .order('created_at', { ascending: false }),
      ]);

    const ids = [decision.owner_id, decision.approved_by, decision.created_by].filter(Boolean);
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', ids);

    res.json({
      decision,
      meeting,
      action_items: actions || [],
      attachments: attachments || [],
      status_history: history || [],
      profiles: Object.fromEntries((profiles || []).map((p) => [p.id, p])),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/', validateBody(decisionCreateSchema), async (req, res, next) => {
  try {
    if (isViewOnly(req.profile) || isManagement(req.profile)) throw httpError(403, 'Forbidden');

    const body = req.validatedBody;
    if (!canCreateDecision(req.profile, body)) throw httpError(403, 'Forbidden');

    const insert = {
      ...body,
      created_by: req.profile.id,
      updated_by: req.profile.id,
      status: body.status || 'proposed',
      approved_by: body.approved_by || null,
      meeting_id: body.meeting_id || null,
    };

    const { data, error } = await supabaseAdmin.from('decisions').insert(insert).select('*').single();
    if (error) throw httpError(400, error.message);

    await supabaseAdmin.from('decision_status_history').insert({
      decision_id: data.id,
      from_status: null,
      to_status: data.status,
      changed_by: req.profile.id,
      notes: 'Created',
    });

    await logActivity({
      entityType: 'decision',
      entityId: data.id,
      action: 'created',
      userId: req.profile.id,
    });

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validateBody(decisionUpdateSchema), async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('decisions').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Decision not found');
    if (!canManageDecision(req.profile, existing)) throw httpError(403, 'Forbidden');
    if (isViewOnly(req.profile) || isManagement(req.profile)) throw httpError(403, 'Forbidden');

    const patch = { ...req.validatedBody, updated_by: req.profile.id };

    const { data, error } = await supabaseAdmin
      .from('decisions')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw httpError(400, error.message);

    if (patch.status && patch.status !== existing.status) {
      await supabaseAdmin.from('decision_status_history').insert({
        decision_id: data.id,
        from_status: existing.status,
        to_status: patch.status,
        changed_by: req.profile.id,
        notes: null,
      });
    }

    await logActivity({
      entityType: 'decision',
      entityId: data.id,
      action: 'updated',
      userId: req.profile.id,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/status', validateBody(decisionStatusSchema), async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('decisions').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Decision not found');
    if (!canManageDecision(req.profile, existing)) throw httpError(403, 'Forbidden');

    const nextStatus = req.validatedBody.status;

    const { data, error } = await supabaseAdmin
      .from('decisions')
      .update({
        status: nextStatus,
        updated_by: req.profile.id,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw httpError(400, error.message);

    await supabaseAdmin.from('decision_status_history').insert({
      decision_id: data.id,
      from_status: existing.status,
      to_status: nextStatus,
      changed_by: req.profile.id,
      notes: req.validatedBody.notes || null,
    });

    await logActivity({
      entityType: 'decision',
      entityId: data.id,
      action: 'status_changed',
      userId: req.profile.id,
      metadata: { from: existing.status, to: nextStatus },
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('decisions').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Decision not found');
    if (!canManageDecision(req.profile, existing)) throw httpError(403, 'Forbidden');
    if (roleSlug(req.profile) !== RoleSlug.ADMIN && roleSlug(req.profile) !== RoleSlug.DEPARTMENT_HEAD) {
      throw httpError(403, 'Forbidden');
    }

    const { error } = await supabaseAdmin.from('decisions').delete().eq('id', req.params.id);
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'decision',
      entityId: existing.id,
      action: 'deleted',
      userId: req.profile.id,
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
