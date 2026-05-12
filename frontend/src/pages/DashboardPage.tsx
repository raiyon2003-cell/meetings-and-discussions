import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Meeting, Decision } from '@/types/models';
import { labelFrom, MEETING_TYPES } from '@/constants/enums';
import { PageLoading } from '@/components/PageLoading';

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

export function DashboardPage() {
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

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total meetings', value: data.totals.meetings },
      { label: 'Finalized meetings', value: data.totals.meetings_finalized },
      { label: 'Total decisions', value: data.totals.decisions },
      { label: 'Approved decisions', value: data.totals.decisions_approved },
      { label: 'Pending decisions', value: data.totals.decisions_pending },
      { label: 'Proposed decisions', value: data.totals.decisions_proposed },
      { label: 'Overdue actions', value: data.totals.actions_overdue },
    ];
  }, [data]);

  if (isLoading && !data) {
    return <PageLoading />;
  }
  if (error) {
    const message = (error as Error).message;
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Dashboard could not load</CardTitle>
          <p className="text-sm text-muted-foreground">
            Data comes from your Render API. Fix the configuration below, then refresh this page.
          </p>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{message}</p>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-8">
      {isPlaceholderData && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Refreshing…
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Operational dashboard</h1>
        <p className="text-muted-foreground">Meetings, decisions, and accountability at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescriptionSmall>{c.label}</CardDescriptionSmall>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Suspense fallback={<PageLoading />}>
        <DashboardCharts
          actionsByOwner={data.actions_by_owner}
          actionsByDepartment={data.actions_by_department}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_meetings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>{labelFrom(MEETING_TYPES, m.meeting_type)}</TableCell>
                    <TableCell>{new Date(m.scheduled_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Link className="text-primary hover:underline" to={`/meetings/${m.id}`}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_decisions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link className="text-primary hover:underline" to={`/decisions/${d.id}`}>
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CardDescriptionSmall({ children }: { children: ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
