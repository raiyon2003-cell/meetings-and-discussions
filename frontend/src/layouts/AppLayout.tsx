import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Moon,
  Sun,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

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
] as const;

const COLLAPSE_KEY = 'segwitz-sidebar-collapsed';

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => toggleTheme()}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppLayout() {
  const profile = useAuthStore((s) => s.profile);
  const roleSlug = profile?.role?.slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const filteredNav = useMemo(
    () =>
      nav.filter((item) => {
        if (!('roles' in item) || !item.roles) return true;
        return (item.roles as readonly string[]).includes(roleSlug ?? '');
      }),
    [roleSlug],
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    useAuthStore.getState().setProfile(null);
    useAuthStore.getState().setSession(null);
  }

  const closeMobile = () => setMobileOpen(false);

  const linkClass = (isActive: boolean, navCollapsed: boolean) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
      navCollapsed ? 'justify-center md:px-2' : '',
      isActive
        ? 'bg-sidebar-active text-white shadow-sm'
        : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground',
    );

  const sidebarInner = (opts: { collapsed: boolean; onNavigate?: () => void }) => (
    <>
      <div
        className={cn(
          'border-b border-white/10 px-4 py-5 transition-all md:px-5',
          opts.collapsed && 'md:px-2 md:py-4',
        )}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-light-lime/95">SegWitz</div>
        {opts.collapsed ? (
          <div
            className="mx-auto mt-3 hidden h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white md:flex"
            aria-hidden
          >
            SW
          </div>
        ) : (
          <>
            <div className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight text-sidebar-foreground">
              Meeting &amp; Decision Repository
            </div>
            <div className="mt-3 h-0.5 w-9 rounded-full bg-brand-steel-teal" aria-hidden />
          </>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {filteredNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={opts.collapsed ? label : undefined}
            onClick={opts.onNavigate}
            className={({ isActive }) => linkClass(isActive, opts.collapsed)}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 opacity-95" aria-hidden />
            <span className={cn('truncate', opts.collapsed && 'md:sr-only')}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 bg-black/15 p-3 md:p-4">
        {!opts.collapsed && (
          <>
            <div className="mb-1 truncate text-sm font-semibold text-sidebar-foreground">{profile?.full_name ?? 'User'}</div>
            <div className="mb-3 truncate text-xs text-sidebar-muted">{profile?.role?.name ?? '—'}</div>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'border-white/20 bg-transparent text-sidebar-foreground transition-colors hover:bg-white/10 hover:text-white',
            opts.collapsed ? 'md:w-full md:px-0' : 'w-full',
          )}
          onClick={() => void handleLogout()}
          title="Log out"
        >
          <LogOut className={cn('h-4 w-4', !opts.collapsed && 'mr-2')} />
          <span className={cn(opts.collapsed && 'md:sr-only')}>Log out</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative z-30 hidden flex-shrink-0 flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground shadow-brand transition-[width] duration-200 ease-out md:flex',
          collapsed ? 'md:w-[4.75rem]' : 'md:w-64',
        )}
      >
        {sidebarInner({ collapsed })}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 hidden h-7 w-7 rounded-full border border-border bg-card text-foreground shadow-md hover:bg-muted md:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </Button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl animate-fade-in md:hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-sidebar-foreground">Menu</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground hover:bg-white/10"
                onClick={closeMobile}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {sidebarInner({ collapsed: false, onNavigate: closeMobile })}
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — mobile + desktop */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 md:h-[3.25rem] md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 md:hidden">
              <div className="truncate text-sm font-semibold tracking-tight text-foreground">SegWitz</div>
              <div className="truncate text-[11px] text-muted-foreground">Meetings &amp; decisions</div>
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>
              <p className="truncate text-sm font-semibold text-foreground">Meeting &amp; decision repository</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              onClick={() => void handleLogout()}
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => void handleLogout()}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8 md:py-10 lg:px-10">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
