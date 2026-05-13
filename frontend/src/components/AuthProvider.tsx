import { useEffect } from 'react';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    async function loadProfileFromApi() {
      try {
        const { data } = await api.get<{ user: unknown }>('/me');
        setProfile(data.user as never);
      } catch {
        setProfile(null);
      }
    }

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await loadProfileFromApi();
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      setSession(session);
      // INITIAL_SESSION duplicates work already done in bootstrap(getSession + /me).
      // TOKEN_REFRESHED does not require reloading profile for this app.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        return;
      }
      if (session) {
        await loadProfileFromApi();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading]);

  return children;
}
