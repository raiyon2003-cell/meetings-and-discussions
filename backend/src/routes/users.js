import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { profileUpdateSchema, userAdminUpdateSchema } from '../validations/schemas.js';
import { canManageUsers } from '../lib/access.js';
import { httpError } from '../utils/httpError.js';
import { logActivity } from '../lib/activity.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    if (!canManageUsers(req.profile)) throw httpError(403, 'Forbidden');
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*, roles(id, name, slug), departments(id, name, slug)')
      .order('full_name');
    if (error) throw httpError(400, error.message);
    res.json(data || []);
  } catch (e) {
    next(e);
  }
});

router.patch('/me', validateBody(profileUpdateSchema), async (req, res, next) => {
  try {
    const patch = req.validatedBody;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', req.profile.id)
      .select('*, roles(id, name, slug)')
      .single();
    if (error) throw httpError(400, error.message);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validateBody(userAdminUpdateSchema), async (req, res, next) => {
  try {
    if (!canManageUsers(req.profile)) throw httpError(403, 'Forbidden');
    const patch = req.validatedBody;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', req.params.id)
      .select('*, roles(id, name, slug)')
      .single();
    if (error) throw httpError(400, error.message);

    await logActivity({
      entityType: 'profile',
      entityId: req.params.id,
      action: 'updated_by_admin',
      userId: req.profile.id,
      metadata: patch,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default router;
