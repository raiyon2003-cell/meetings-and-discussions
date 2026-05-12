import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  canManageAction,
  canReadAction,
  isManagement,
  isViewOnly,
  roleSlug,
  RoleSlug,
  canReadAll,
} from '../lib/access.js';
import { logActivity } from '../lib/activity.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { actionCreateSchema, actionUpdateSchema } from '../validations/schemas.js';
import { meta, parsePagination } from '../utils/pagination.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

const listQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  meeting_id: z.string().uuid().optional(),
  decision_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  overdue: z.coerce.boolean().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

function scopeActionsQuery(q, profile) {
  if (canReadAll(profile)) return q;
  if (roleSlug(profile) === RoleSlug.ADMIN) return q;
  if (roleSlug(profile) === RoleSlug.TEAM_MEMBER) {
    return q.eq('assigned_to', profile.id);
  }
  if (roleSlug(profile) === RoleSlug.DEPARTMENT_HEAD) {
    if (!profile.department_id) return q.eq('id', '00000000-0000-0000-0000-000000000000');
    return q;
  }
  if (roleSlug(profile) === RoleSlug.PROJECT_MANAGER) {
    return q;
  }
  return q.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`);
}

async function loadContextForAction(action) {
  let meeting;
  let decision;
  if (action.meeting_id) {
    const { data } = await supabaseAdmin.from('meetings').select('*').eq('id', action.meeting_id).single();
    meeting = data;
  }
  if (action.decision_id) {
    const { data } = await supabaseAdmin.from('decisions').select('*').eq('id', action.decision_id).single();
    decision = data;
  }
  return { meeting, decision };
}

router.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const q = req.validatedQuery;
    const { page, limit, offset } = parsePagination(q);

    let query = supabaseAdmin
      .from('action_items')
      .select('id,title,priority,due_date,status,meeting_id,decision_id,assigned_to,created_by', { count: 'exact' })
      .order('due_date', { ascending: true });

    query = scopeActionsQuery(query, req.profile);

    if (q.search) query = query.ilike('title', `%${q.search}%`);
    if (q.status) query = query.eq('status', q.status);
    if (q.priority) query = query.eq('priority', q.priority);
    if (q.meeting_id) query = query.eq('meeting_id', q.meeting_id);
    if (q.decision_id) query = query.eq('decision_id', q.decision_id);
    if (q.assigned_to) query = query.eq('assigned_to', q.assigned_to);
    if (q.date_from) query = query.gte('due_date', q.date_from);
    if (q.date_to) query = query.lte('due_date', q.date_to);
    if (q.overdue) {
      const today = new Date().toISOString().slice(0, 10);
      query = query
        .lt('due_date', today)
        .neq('status', 'completed')
        .neq('status', 'cancelled');
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw httpError(400, error.message);

    const rows = data || [];
    const mIds = [...new Set(rows.map((r) => r.meeting_id).filter(Boolean))];
    const dIds = [...new Set(rows.map((r) => r.decision_id).filter(Boolean))];

    const [mRes, dRes] = await Promise.all([
      mIds.length
        ? supabaseAdmin.from('meetings').select('id,department_id,owner_id,meeting_type').in('id', mIds)
        : Promise.resolve({ data: [] }),
      dIds.length
        ? supabaseAdmin.from('decisions').select('id,department_id').in('id', dIds)
        : Promise.resolve({ data: [] }),
    ]);

    const meetingsCache = new Map((mRes.data || []).map((m) => [m.id, m]));
    const decisionsCache = new Map((dRes.data || []).map((d) => [d.id, d]));

    const filtered = [];
    for (const a of rows) {
      const m = a.meeting_id ? meetingsCache.get(a.meeting_id) : null;
      const d = a.decision_id ? decisionsCache.get(a.decision_id) : null;
      if (roleSlug(req.profile) === RoleSlug.DEPARTMENT_HEAD && req.profile.department_id) {
        const inDept =
          (m && m.department_id === req.profile.department_id) ||
          (d && d.department_id === req.profile.department_id);
        if (!inDept) continue;
      }
      if (canReadAction(req.profile, a, m, d)) {
        filtered.push({ ...a, _meeting: m, _decision: d });
      }
    }

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
    const { data: action, error } = await supabaseAdmin
      .from('action_items')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !action) throw httpError(404, 'Action not found');

    const { meeting, decision } = await loadContextForAction(action);
    if (!canReadAction(req.profile, action, meeting, decision)) {
      throw httpError(403, 'Forbidden');
    }

    const { data: assignee } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', action.assigned_to)
      .single();

    res.json({ action, meeting, decision, assignee });
  } catch (e) {
    next(e);
  }
});

router.post('/', validateBody(actionCreateSchema), async (req, res, next) => {
  try {
    if (isViewOnly(req.profile) || isManagement(req.profile)) throw httpError(403, 'Forbidden');

    const body = req.validatedBody;
    const meetingsCache = new Map();
    const decisionsCache = new Map();
    if (body.meeting_id) {
      const { data: m } = await supabaseAdmin.from('meetings').select('*').eq('id', body.meeting_id).single();
      if (m) meetingsCache.set(m.id, m);
    }
    if (body.decision_id) {
      const { data: d } = await supabaseAdmin.from('decisions').select('*').eq('id', body.decision_id).single();
      if (d) decisionsCache.set(d.id, d);
    }

    const probe = { ...body, meeting_id: body.meeting_id, decision_id: body.decision_id };
    if (!canManageAction(req.profile, probe, meetingsCache, decisionsCache)) {
      throw httpError(403, 'Forbidden');
    }

    const insert = {
      ...body,
      created_by: req.profile.id,
      updated_by: req.profile.id,
      status: body.status || 'not_started',
      priority: body.priority || 'medium',
    };

    const { data, error } = await supabaseAdmin.from('action_items').insert(insert).select('*').single();
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'action_item',
      entityId: data.id,
      action: 'created',
      userId: req.profile.id,
    });

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validateBody(actionUpdateSchema), async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('action_items').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Not found');

    const meetingsCache = new Map();
    const decisionsCache = new Map();
    if (existing.meeting_id) {
      const { data: m } = await supabaseAdmin.from('meetings').select('*').eq('id', existing.meeting_id).single();
      if (m) meetingsCache.set(m.id, m);
    }
    if (existing.decision_id) {
      const { data: d } = await supabaseAdmin.from('decisions').select('*').eq('id', existing.decision_id).single();
      if (d) decisionsCache.set(d.id, d);
    }

    if (!canManageAction(req.profile, existing, meetingsCache, decisionsCache)) {
      throw httpError(403, 'Forbidden');
    }

    if (isManagement(req.profile)) throw httpError(403, 'Forbidden');

    if (roleSlug(req.profile) === RoleSlug.TEAM_MEMBER) {
      const allowedKeys = new Set(['status', 'completion_notes', 'updated_by']);
      const keys = Object.keys(req.validatedBody);
      if (!keys.every((k) => allowedKeys.has(k))) {
        throw httpError(403, 'Team members may only update status and completion notes');
      }
    }

    const patch = { ...req.validatedBody, updated_by: req.profile.id };

    const { data, error } = await supabaseAdmin
      .from('action_items')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'action_item',
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
    const { data: existing } = await supabaseAdmin.from('action_items').select('*').eq('id', req.params.id).single();
    if (!existing) throw httpError(404, 'Not found');

    const meetingsCache = new Map();
    const decisionsCache = new Map();
    if (existing.meeting_id) {
      const { data: m } = await supabaseAdmin.from('meetings').select('*').eq('id', existing.meeting_id).single();
      if (m) meetingsCache.set(m.id, m);
    }
    if (existing.decision_id) {
      const { data: d } = await supabaseAdmin.from('decisions').select('*').eq('id', existing.decision_id).single();
      if (d) decisionsCache.set(d.id, d);
    }

    if (!canManageAction(req.profile, existing, meetingsCache, decisionsCache)) {
      throw httpError(403, 'Forbidden');
    }
    if (roleSlug(req.profile) !== RoleSlug.ADMIN && roleSlug(req.profile) !== RoleSlug.DEPARTMENT_HEAD) {
      throw httpError(403, 'Forbidden');
    }

    const { error } = await supabaseAdmin.from('action_items').delete().eq('id', req.params.id);
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'action_item',
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
