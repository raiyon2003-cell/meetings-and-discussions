import { memo, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#28666e', '#588157', '#819171', '#073b4c', '#344e41'];

type Props = {
  actionsByOwner: Record<string, number>;
  actionsByDepartment: Record<string, number>;
};

function DashboardChartsInner({ actionsByOwner, actionsByDepartment }: Props) {
  const ownerChart = useMemo(
    () =>
      Object.entries(actionsByOwner).map(([id, count]) => ({
        name: id.slice(0, 8) + '…',
        count,
      })),
    [actionsByOwner],
  );

  const deptChart = useMemo(
    () =>
      Object.entries(actionsByDepartment).map(([id, count]) => ({
        name: id.slice(0, 8),
        count,
      })),
    [actionsByDepartment],
  );

  const tooltipStyles = {
    borderRadius: '8px',
    border: '1px solid hsl(var(--border) / 0.8)',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
    boxShadow: '0 4px 20px hsl(var(--foreground) / 0.06)',
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base">Actions by assignee</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Sample distribution across owners</p>
        </CardHeader>
        <CardContent className="px-2 pb-2 pt-4 sm:px-4">
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={36} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyles} cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} />
                <Bar dataKey="count" fill="#28666e" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base">Actions by department</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">Share of open work by org unit</p>
        </CardHeader>
        <CardContent className="px-2 pb-2 pt-4 sm:px-4">
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptChart}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={88}
                  paddingAngle={2}
                  label={false}
                >
                  {deptChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyles} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(DashboardChartsInner);
