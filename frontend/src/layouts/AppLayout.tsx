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
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SegWitz</div>
          <div className="mt-1 text-lg font-semibold text-foreground">Meeting & Decision Repository</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {filteredNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 truncate text-sm font-medium">{profile?.full_name ?? 'User'}</div>
          <div className="mb-3 truncate text-xs text-muted-foreground">{profile?.role?.name ?? '—'}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => void handleLogout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <span className="font-semibold">SegWitz</span>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
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
