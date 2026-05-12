import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        try {
          const { data } = await api.get<{ user: unknown }>('/me');
          setProfile(data.user as never);
        } catch {
          setProfile(null);
        }
      }
      setLoading(false);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      setSession(session);
      if (session) {
        try {
          const { data } = await api.get<{ user: unknown }>('/me');
          setProfile(data.user as never);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading]);

  return children;
}
