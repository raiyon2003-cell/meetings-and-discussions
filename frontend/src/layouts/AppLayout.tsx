import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Gavel,
  ListTodo,
  Users,
  Building2,
  FolderTree,
  Search,
  Paperclip,
  Settings,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meetings', label: 'Meetings', icon: Calendar },
  { to: '/decisions', label: 'Decisions', icon: Gavel },
  { to: '/actions', label: 'Action Items', icon: ListTodo },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/attachments', label: 'Attachments', icon: Paperclip },
  { to: '/divisions', label: 'Divisions', icon: Building2 },
  { to: '/departments', label: 'Departments', icon: FolderTree },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export function AppLayout() {
  const profile = useAuthStore((s) => s.profile);
  const roleSlug = profile?.role?.slug;

  const filteredNav = nav.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(roleSlug ?? '');
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    useAuthStore.getState().setProfile(null);
    useAuthStore.getState().setSession(null);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand: Night Forest / Deep Teal sidebar (dark mod per guideline) */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-white/10 bg-sidebar text-sidebar-foreground shadow-brand md:flex md:flex-col">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-light-lime">SegWitz</div>
          <div className="mt-1.5 text-base font-semibold leading-snug text-sidebar-foreground">
            Meeting &amp; Decision Repository
          </div>
          <div className="mt-3 h-0.5 w-10 rounded-full bg-brand-steel-teal" aria-hidden />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {filteredNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-white shadow-sm'
                    : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 bg-black/10 p-4">
          <div className="mb-1 truncate text-sm font-semibold text-sidebar-foreground">{profile?.full_name ?? 'User'}</div>
          <div className="mb-3 truncate text-xs text-sidebar-muted">{profile?.role?.name ?? '—'}</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/25 bg-transparent text-sidebar-foreground hover:bg-white/10 hover:text-white"
            onClick={() => void handleLogout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground shadow-sm md:hidden">
          <span className="font-semibold tracking-tight">SegWitz</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:bg-white/10 hover:text-white"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
