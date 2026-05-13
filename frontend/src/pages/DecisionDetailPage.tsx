import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ActionItem, Attachment, Decision, Meeting } from '@/types/models';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { PageLoading } from '@/components/PageLoading';
import { StatusBadge } from '@/components/StatusBadge';

type Detail = {
  decision: Decision;
  meeting: Meeting | null;
  action_items: ActionItem[];
  attachments: Attachment[];
  status_history: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    created_at: string;
    notes?: string | null;
  }>;
  profiles: Record<string, { full_name: string; email: string }>;
};

export function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.profile?.role?.slug);

  const { data, isLoading } = useQuery({
    queryKey: ['decision', id],
    queryFn: async () => {
      const { data: res } = await api.get<Detail>(`/decisions/${id}`);
      return res;
    },
    staleTime: 30_000,
  });

  const deleteMut = useMutation({
    mutationFn: async () => api.delete(`/decisions/${id}`),
    onSuccess: () => {
      toast.success('Decision deleted');
      navigate('/decisions');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entity_type', 'decision');
    fd.append('entity_id', id!);
    await api.post('/attachments', fd);
    toast.success('Uploaded');
    qc.invalidateQueries({ queryKey: ['decision', id] });
  }

  async function download(att: Attachment) {
    const { data } = await api.get<{ url: string }>(`/attachments/${att.id}/download`);
    window.open(data.url, '_blank', 'noopener,noreferrer');
  }

  if (isLoading || !data) return <PageLoading />;

  const d = data.decision;
  const canEdit = role && !['view_only', 'management', 'team_member'].includes(role);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{d.title}</h1>
          <StatusBadge kind="decision" value={d.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button asChild variant="outline" className="shadow-sm">
                <Link to={`/decisions/${d.id}/edit`}>Edit</Link>
              </Button>
              {(role === 'admin' || role === 'department_head') && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Delete decision?')) deleteMut.mutate();
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
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm whitespace-pre-wrap">
          <p>{d.description}</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Impact area: </span>
              {d.impact_area || '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Project / client: </span>
              {d.related_project_client || '—'}
            </div>
            <div>
              <span className="text-muted-foreground">Date decided: </span>
              {d.date_decided}
            </div>
            <div>
              <span className="text-muted-foreground">Owner: </span>
              {data.profiles[d.owner_id]?.full_name ?? d.owner_id}
            </div>
            <div>
              <span className="text-muted-foreground">Approved by: </span>
              {d.approved_by ? data.profiles[d.approved_by]?.full_name ?? d.approved_by : '—'}
            </div>
          </div>
          <div>
            <span className="font-medium">Remarks</span>
            <p className="text-muted-foreground">{d.remarks || '—'}</p>
          </div>
        </CardContent>
      </Card>

      {data.meeting && (
        <Card>
          <CardHeader>
            <CardTitle>Source meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="link-subtle font-medium" to={`/meetings/${data.meeting.id}`}>
              {data.meeting.title}
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Related actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-[88px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.action_items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[200px] truncate font-medium">{a.title}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusBadge kind="action" value={a.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.due_date}</TableCell>
                  <TableCell>
                    <Link className="link-subtle text-sm" to={`/actions/${a.id}`}>
                      Open
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
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.status_history.map((h) => (
            <div key={h.id} className="border-l-2 border-primary pl-3 text-sm">
              <div className="font-medium">
                {h.from_status ?? '—'} → {h.to_status}
              </div>
              <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              {h.notes && <div>{h.notes}</div>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && <Input type="file" onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0])} />}
          <Table>
            <TableBody>
              {data.attachments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.file_name}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" type="button" onClick={() => void download(a)}>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
