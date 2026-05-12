import { supabaseAdmin } from '../lib/supabase.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      const err = new Error('Invalid or expired token');
      err.status = 401;
      throw err;
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select(
        `
        *,
        roles ( id, name, slug )
      `,
      )
      .eq('id', userData.user.id)
      .single();

    if (profErr || !profile) {
      const err = new Error('Profile not found');
      err.status = 403;
      throw err;
    }

    req.authUser = userData.user;
    req.accessToken = token;
    req.profile = {
      ...profile,
      role: profile.roles,
    };
    delete req.profile.roles;
    next();
  } catch (e) {
    next(e);
  }
}
