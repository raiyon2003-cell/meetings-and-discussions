import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/** Service role client — bypasses RLS; use only after JWT verification in middleware. */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
