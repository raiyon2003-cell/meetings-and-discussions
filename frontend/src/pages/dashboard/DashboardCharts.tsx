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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-0 shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Actions by assignee (sample)</h3>
        </div>
        <div className="h-72 p-6 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ownerChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={36} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#28666e" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-0 shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Actions by department</h3>
        </div>
        <div className="h-72 p-6 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deptChart}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={88}
                label={false}
              >
                {deptChart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardChartsInner);
