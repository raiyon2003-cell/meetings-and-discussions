import { lazy, memo, Suspense, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Gavel,
  CheckCircle2,
  Clock,
  FileQuestion,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Meeting, Decision } from '@/types/models';
import { labelFrom, MEETING_TYPES } from '@/constants/enums';
import { PageLoading } from '@/components/PageLoading';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DashboardCharts = lazy(() => import('./dashboard/DashboardCharts'));

type Summary = {
  totals: {
    meetings: number;
    meetings_finalized: number;
    decisions: number;
    decisions_approved: number;
    decisions_pending: number;
    decisions_proposed: number;
    actions_overdue: number;
  };
  recent_meetings: Meeting[];
  recent_decisions: Decision[];
  actions_by_owner: Record<string, number>;
  actions_by_department: Record<string, number>;
};

type StatDef = {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
};

export function DashboardPage() {
  const qc = useQueryClient();
  const apiOrigin = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : '';

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data: res } = await api.get<Summary>('/dashboard/summary');
      return res;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const stats = useMemo((): StatDef[] => {
    if (!data) return [];
    const t = data.totals;
    return [
      { label: 'Total meetings', value: t.meetings, icon: Calendar, accent: 'from-sky-500/15 to-transparent' },
      { label: 'Finalized', value: t.meetings_finalized, icon: CheckCircle2, accent: 'from-emerald-500/15 to-transparent' },
      { label: 'Decisions', value: t.decisions, icon: Gavel, accent: 'from-violet-500/12 to-transparent' },
      { label: 'Approved', value: t.decisions_approved, icon: CheckCircle2, accent: 'from-emerald-500/15 to-transparent' },
      { label: 'Pending review', value: t.decisions_pending, icon: Clock, accent: 'from-amber-500/12 to-transparent' },
      { label: 'Proposed', value: t.decisions_proposed, icon: FileQuestion, accent: 'from-slate-500/12 to-transparent' },
      { label: 'Overdue actions', value: t.actions_overdue, icon: AlertTriangle, accent: 'from-red-500/12 to-transparent' },
    ];
  }, [data]);

  if (isLoading && !data) {
    return <PageLoading />;
  }
  if (error) {
    const message = (error as Error).message;
    return (
      <Card className="overflow-hidden border-destructive/30 bg-destructive/[0.06] shadow-card">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-destructive">Dashboard could not load</CardTitle>
            <p className="text-sm text-muted-foreground">
              Data comes from your API. Fix the configuration below, then refresh this page.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/80 p-4 text-sm leading-relaxed text-foreground">
            {message}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="default" onClick={() => void qc.invalidateQueries({ queryKey: ['dashboard-summary'] })}>
              Retry loading dashboard
            </Button>
            {apiOrigin ? (
              <Button type="button" variant="outline" asChild>
                <a href={`${apiOrigin}/health`} target="_blank" rel="noopener noreferrer">
                  Open API health (wake Render)
                </a>
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            If this persists: on Render, set <code className="rounded bg-muted px-1">FRONTEND_URL</code> to your exact site URL
            (same as the browser address bar), redeploy the API, or confirm CORS allows your Vercel origin.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-10">
      {isPlaceholderData && (
        <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
          Refreshing…
        </p>
      )}

      <header className="space-y-2 border-b border-border/60 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Operational dashboard</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Meetings, decisions, and accountability at a glance. Metrics refresh when you revisit this page.
        </p>
      </header>

      <section aria-label="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      <Suspense fallback={<PageLoading />}>
        <DashboardCharts
          actionsByOwner={data.actions_by_owner}
          actionsByDepartment={data.actions_by_department}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="px-0 pb-4">
            <div className="surface-table mx-4 border-0 shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">When</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_meetings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="max-w-[140px] truncate font-medium sm:max-w-none">{m.title}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {labelFrom(MEETING_TYPES, m.meeting_type)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {new Date(m.scheduled_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          to={`/meetings/${m.id}`}
                        >
                          View
                          <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!data.recent_meetings.length && (
              <p className="px-6 pb-2 text-center text-sm text-muted-foreground">No recent meetings.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent decisions</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="px-0 pb-4">
            <div className="surface-table mx-4 border-0 shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_decisions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-[160px] truncate font-medium">{d.title}</TableCell>
                      <TableCell>
                        <StatusBadge kind="decision" value={d.status} />
                      </TableCell>
                      <TableCell>
                        <Link
                          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          to={`/decisions/${d.id}`}
                        >
                          View
                          <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!data.recent_decisions.length && (
              <p className="px-6 pb-2 text-center text-sm text-muted-foreground">No recent decisions.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StatCard = memo(function StatCard({ label, value, icon: Icon, accent }: StatDef) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card transition-all duration-200',
        'hover:border-primary/20 hover:shadow-card-hover',
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80', accent)} aria-hidden />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-5 pt-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        </div>
        <div className="rounded-lg bg-muted/80 p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </CardHeader>
    </Card>
  );
});
