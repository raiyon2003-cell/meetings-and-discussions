import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ListTodo } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ActionItem } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { PageLoading } from '@/components/PageLoading';

export function ActionsPage() {
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const canCreate = role && !['view_only', 'management', 'team_member'].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ['actions'],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: ActionItem[] }>('/action-items', { params: { limit: 80 } });
      return body.data;
    },
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Action items"
        description="Assignments, due dates, and completion tracking for accountable follow-through."
        actions={
          canCreate ? (
            <Button asChild className="shadow-sm">
              <Link to="/actions/new">
                <Plus className="mr-2 h-4 w-4" />
                New action
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="surface-table">
        {isLoading && !data ? (
          <PageLoading />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[88px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((a) => {
                const overdue =
                  a.due_date < today && a.status !== 'completed' && a.status !== 'cancelled';
                return (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[200px] truncate font-medium md:max-w-none">{a.title}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge kind="priority" value={a.priority} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <span>{a.due_date}</span>
                      {overdue && (
                        <Badge className="ml-2 align-middle" variant="destructive">
                          Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge kind="action" value={a.status} />
                    </TableCell>
                    <TableCell>
                      <Link className="link-subtle text-sm" to={`/actions/${a.id}`}>
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!isLoading && data && !data.length && (
          <div className="border-t border-border/60 p-6">
            <EmptyState icon={ListTodo} title="No action items" description="Create an action to track deliverables and owners." />
          </div>
        )}
      </div>
    </div>
  );
}
