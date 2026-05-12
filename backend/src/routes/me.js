import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.profile.id,
      email: req.profile.email,
      full_name: req.profile.full_name,
      avatar_url: req.profile.avatar_url,
      department_id: req.profile.department_id,
      role: req.profile.role,
    },
  });
});

export default router;
