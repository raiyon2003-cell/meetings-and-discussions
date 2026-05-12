import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ActionItem } from '@/types/models';
import { ACTION_PRIORITY, ACTION_STATUS, labelFrom } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';

export function ActionsPage() {
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const canCreate = role && !['view_only', 'management', 'team_member'].includes(role);

  const { data } = useQuery({
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Action items</h1>
          <p className="text-muted-foreground">Assignments, due dates, and completion tracking.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/actions/new">
              <Plus className="mr-2 h-4 w-4" />
              New action
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((a) => {
              const overdue =
                a.due_date < today && a.status !== 'completed' && a.status !== 'cancelled';
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{labelFrom(ACTION_PRIORITY, a.priority)}</TableCell>
                  <TableCell>
                    {a.due_date}
                    {overdue && (
                      <Badge className="ml-2" variant="destructive">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{labelFrom(ACTION_STATUS, a.status)}</TableCell>
                  <TableCell>
                    <Link className="text-primary hover:underline" to={`/actions/${a.id}`}>
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
