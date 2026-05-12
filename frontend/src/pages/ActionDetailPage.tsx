import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ActionItem, Decision, Meeting } from '@/types/models';
import { ACTION_PRIORITY, ACTION_STATUS, labelFrom } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';

export function ActionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const profileId = useAuthStore((s) => s.profile?.id);

  const { data, refetch } = useQuery({
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

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const a = data.action;
  const canEdit =
    role &&
    (role === 'admin' ||
      role === 'department_head' ||
      role === 'project_manager' ||
      (role === 'team_member' && a.assigned_to === profileId));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{a.title}</h1>
          <p className="text-muted-foreground">
            {labelFrom(ACTION_PRIORITY, a.priority)} · {labelFrom(ACTION_STATUS, a.status)}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button asChild variant="outline">
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

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="whitespace-pre-wrap">{a.description || '—'}</p>
          <div>Due: {a.due_date}</div>
          {data.meeting && (
            <div>
              Meeting:{' '}
              <Link className="text-primary hover:underline" to={`/meetings/${data.meeting.id}`}>
                {data.meeting.title}
              </Link>
            </div>
          )}
          {data.decision && (
            <div>
              Decision:{' '}
              <Link className="text-primary hover:underline" to={`/decisions/${data.decision.id}`}>
                {data.decision.title}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {role === 'team_member' && a.assigned_to === profileId && (
        <Card>
          <CardHeader>
            <CardTitle>Update progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
