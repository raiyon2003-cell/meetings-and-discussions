import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { canManageOrgStructure, roleSlug, RoleSlug } from '../lib/access.js';
import { httpError } from '../utils/httpError.js';

const router = Router();
router.use(authenticate);

router.get('/divisions', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('divisions').select('*').order('name');
    if (error) throw httpError(400, error.message);
    res.json(data || []);
  } catch (e) {
    next(e);
  }
});

router.get('/departments', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('departments').select('*').order('name');
    if (error) throw httpError(400, error.message);
    res.json(data || []);
  } catch (e) {
    next(e);
  }
});

router.get('/roles', async (req, res, next) => {
  try {
    if (roleSlug(req.profile) !== RoleSlug.ADMIN) throw httpError(403, 'Forbidden');
    const { data, error } = await supabaseAdmin.from('roles').select('*').order('name');
    if (error) throw httpError(400, error.message);
    res.json(data || []);
  } catch (e) {
    next(e);
  }
});

router.post('/divisions', async (req, res, next) => {
  try {
    if (!canManageOrgStructure(req.profile)) throw httpError(403, 'Forbidden');
    const { name, slug } = req.body;
    const { data, error } = await supabaseAdmin.from('divisions').insert({ name, slug }).select('*').single();
    if (error) throw httpError(400, error.message);
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

router.post('/departments', async (req, res, next) => {
  try {
    if (!canManageOrgStructure(req.profile)) throw httpError(403, 'Forbidden');
    const { division_id, name, slug } = req.body;
    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert({ division_id, name, slug })
      .select('*')
      .single();
    if (error) throw httpError(400, error.message);
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

export default router;
