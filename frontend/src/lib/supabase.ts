import { createClient } from '@supabase/supabase-js';

/** Vite loads env; strip optional quotes so JWT '=' padding does not break parsers */
function envStr(v: unknown): string {
  if (typeof v !== 'string') return '';
  let s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

const url = envStr(import.meta.env.VITE_SUPABASE_URL);
const anon = envStr(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (import.meta.env.DEV) {
  if (!url || !anon) {
    console.error('[SegWitz] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env');
  } else if (anon.length < 80) {
    console.error(
      '[SegWitz] VITE_SUPABASE_ANON_KEY looks too short — paste the full anon JWT from Supabase → Settings → API',
    );
  }
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
