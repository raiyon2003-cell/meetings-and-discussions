import { useEffect } from 'react';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const BOOTSTRAP_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Auth bootstrap timed out')), ms);
    }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileFromApi() {
      try {
        const { data } = await api.get<{ user: unknown }>('/me');
        if (!cancelled) setProfile(data.user as never);
      } catch {
        if (!cancelled) setProfile(null);
      }
    }

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), BOOTSTRAP_TIMEOUT_MS);
        if (cancelled) return;
        setSession(session);
        if (session) {
          await loadProfileFromApi();
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('[SegWitz] Auth bootstrap failed', e);
        if (!cancelled) {
          await supabase.auth.signOut().catch(() => undefined);
          setSession(null);
          setProfile(null);
        }
      } finally {
        // Always clear loading (avoids stuck disabled login in React Strict Mode remounts).
        setLoading(false);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      setSession(session);
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        return;
      }
      if (session) {
        await loadProfileFromApi();
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);

  return children;
}
