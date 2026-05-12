import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Attachment, Decision, Meeting, ActionItem } from '@/types/models';
import { labelFrom, MEETING_TYPES, MEETING_STATUS } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';

type Detail = {
  meeting: Meeting;
  attendees: Array<{ user_id: string; status: string }>;
  attendee_profiles: Record<string, { full_name: string; email: string }>;
  decisions: Decision[];
  action_items: ActionItem[];
  attachments: Attachment[];
  activity: Array<{ id: string; action: string; created_at: string; metadata?: Record<string, unknown> }>;
};

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.profile?.role?.slug);

  const { data, isLoading, error } = useQuery({
    queryKey: ['meeting-detail', id],
    queryFn: async () => {
      const { data: res } = await api.get<Detail>(`/meetings/${id}`);
      return res;
    },
  });

  const finalizeMut = useMutation({
    mutationFn: async () => {
      await api.post(`/meetings/${id}/finalize`);
    },
    onSuccess: () => {
      toast.success('Meeting finalized');
      qc.invalidateQueries({ queryKey: ['meeting-detail', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await api.delete(`/meetings/${id}`);
    },
    onSuccess: () => {
      toast.success('Meeting deleted');
      navigate('/meetings');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadFile(file: File) {
    if (!id) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entity_type', 'meeting');
    fd.append('entity_id', id);
    await api.post('/attachments', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    toast.success('Uploaded');
    qc.invalidateQueries({ queryKey: ['meeting-detail', id] });
  }

  async function downloadAttachment(att: Attachment) {
    const { data } = await api.get<{ url: string; file_name: string }>(`/attachments/${att.id}/download`);
    window.open(data.url, '_blank', 'noopener,noreferrer');
  }

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (error || !data) return <div className="text-red-600">{(error as Error)?.message}</div>;

  const m = data.meeting;
  const canEdit = role && !['view_only', 'management', 'team_member'].includes(role);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{m.title}</h1>
            <Badge variant={m.status === 'finalized' ? 'success' : 'secondary'}>{labelFrom(MEETING_STATUS, m.status)}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{labelFrom(MEETING_TYPES, m.meeting_type)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button asChild variant="outline">
                <Link to={`/meetings/${m.id}/edit`}>Edit</Link>
              </Button>
              {m.status === 'draft' && (
                <Button onClick={() => finalizeMut.mutate()} disabled={finalizeMut.isPending}>
                  Finalize
                </Button>
              )}
              {(role === 'admin' || role === 'department_head') && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Delete this meeting permanently?')) deleteMut.mutate();
                  }}
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schedule & routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="When" value={new Date(m.scheduled_at).toLocaleString()} />
            <Row label="Location" value={m.location || '—'} />
            <Row label="Online link" value={m.online_meeting_link || '—'} />
            <Row label="Project / client" value={m.related_project_client || '—'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <section>
              <h4 className="font-medium">Agenda</h4>
              <p className="whitespace-pre-wrap text-muted-foreground">{m.agenda || '—'}</p>
            </section>
            <section>
              <h4 className="font-medium">Discussion summary</h4>
              <p className="whitespace-pre-wrap text-muted-foreground">{m.discussion_summary || '—'}</p>
            </section>
            <section>
              <h4 className="font-medium">Key discussion points</h4>
              <p className="whitespace-pre-wrap text-muted-foreground">{m.key_discussion_points || '—'}</p>
            </section>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.attendees.map((a) => (
                <TableRow key={a.user_id}>
                  <TableCell>{data.attendee_profiles[a.user_id]?.full_name ?? a.user_id}</TableCell>
                  <TableCell>{a.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decisions</CardTitle>
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
              {data.decisions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.title}</TableCell>
                  <TableCell>{d.status}</TableCell>
                  <TableCell>
                    <Link className="text-primary hover:underline" to={`/decisions/${d.id}`}>
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
          <CardTitle>Action items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.action_items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.due_date}</TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell>
                    <Link className="text-primary hover:underline" to={`/actions/${a.id}`}>
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
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                }}
              />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.attachments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.file_name}</TableCell>
                  <TableCell>
                    <Button type="button" variant="outline" size="sm" onClick={() => void downloadAttachment(a)}>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.activity.map((log) => (
            <div key={log.id} className="border-l-2 border-primary pl-3 text-sm">
              <div className="font-medium">{log.action}</div>
              <div className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!data.activity.length && <div className="text-muted-foreground">No activity yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
