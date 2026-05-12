import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Meeting, Decision } from '@/types/models';
import { labelFrom, MEETING_TYPES } from '@/constants/enums';

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

const COLORS = ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data: res } = await api.get<Summary>('/dashboard/summary');
      return res;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading dashboard…</div>;
  if (error) return <div className="text-red-600">{(error as Error).message}</div>;
  if (!data) return null;

  const ownerChart = Object.entries(data.actions_by_owner).map(([id, count]) => ({
    name: id.slice(0, 8) + '…',
    count,
  }));

  const deptChart = Object.entries(data.actions_by_department).map(([id, count]) => ({
    name: id.slice(0, 8),
    count,
  }));

  const summaryCards = [
    { label: 'Total meetings', value: data.totals.meetings },
    { label: 'Finalized meetings', value: data.totals.meetings_finalized },
    { label: 'Total decisions', value: data.totals.decisions },
    { label: 'Approved decisions', value: data.totals.decisions_approved },
    { label: 'Pending decisions', value: data.totals.decisions_pending },
    { label: 'Proposed decisions', value: data.totals.decisions_proposed },
    { label: 'Overdue actions', value: data.totals.actions_overdue },
  ];

  return (
    <div className="space-y-8">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions by assignee (sample)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions by department</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {deptChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
