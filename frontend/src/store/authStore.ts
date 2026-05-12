import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export type RoleInfo = { id: string; name: string; slug: string };

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  department_id?: string | null;
  role?: RoleInfo | null;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  setProfile: (p: Profile | null) => void;
  setLoading: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
