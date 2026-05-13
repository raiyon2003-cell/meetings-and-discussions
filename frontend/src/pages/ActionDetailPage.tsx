import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ActionItem, Decision, Meeting } from '@/types/models';
import { ACTION_STATUS } from '@/constants/enums';
import { PageLoading } from '@/components/PageLoading';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/store/authStore';

export function ActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const profileId = useAuthStore((s) => s.profile?.id);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['action', id],
    queryFn: async () => {
      const { data: res } = await api.get<{ action: ActionItem; meeting: Meeting | null; decision: Decision | null }>(
        `/action-items/${id}`,
      );
      return res;
    },
  });

  const updateMut = useMutation({
    mutationFn: async (patch: Partial<ActionItem>) => {
      await api.patch(`/action-items/${id}`, patch);
    },
    onSuccess: () => {
      toast.success('Updated');
      void refetch();
      qc.invalidateQueries({ queryKey: ['actions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => api.delete(`/action-items/${id}`),
    onSuccess: () => {
      toast.success('Deleted');
      navigate('/actions');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <PageLoading />;

  const a = data.action;
  const canEdit =
    role &&
    (role === 'admin' ||
      role === 'department_head' ||
      role === 'project_manager' ||
      (role === 'team_member' && a.assigned_to === profileId));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{a.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="priority" value={a.priority} />
            <StatusBadge kind="action" value={a.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button asChild variant="outline" className="shadow-sm">
                <Link to={`/actions/${a.id}/edit`}>Edit</Link>
              </Button>
              {(role === 'admin' || role === 'department_head') && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Delete this action item?')) deleteMut.mutate();
                  }}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p className="whitespace-pre-wrap text-foreground">{a.description || '—'}</p>
          <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due</span>
            <div className="mt-1 font-medium text-foreground">{a.due_date}</div>
          </div>
          {data.meeting && (
            <div>
              <span className="text-muted-foreground">Meeting: </span>
              <Link className="link-subtle font-medium" to={`/meetings/${data.meeting.id}`}>
                {data.meeting.title}
              </Link>
            </div>
          )}
          {data.decision && (
            <div>
              <span className="text-muted-foreground">Decision: </span>
              <Link className="link-subtle font-medium" to={`/decisions/${data.decision.id}`}>
                {data.decision.title}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {role === 'team_member' && a.assigned_to === profileId && (
        <Card className="transition-shadow hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Update progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="select-native"
                defaultValue={a.status}
                onChange={(e) => updateMut.mutate({ status: e.target.value })}
              >
                {ACTION_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Completion notes</Label>
              <Textarea defaultValue={a.completion_notes ?? ''} onBlur={(e) => updateMut.mutate({ completion_notes: e.target.value })} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
