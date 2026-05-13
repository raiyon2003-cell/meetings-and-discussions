import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Attachment, Decision, Meeting, ActionItem } from '@/types/models';
import { labelFrom, MEETING_TYPES } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/PageLoading';
import { StatusBadge } from '@/components/StatusBadge';

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

  if (isLoading) return <PageLoading />;
  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/[0.06]">
        <CardHeader>
          <CardTitle className="text-destructive">Could not load meeting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message ?? 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  const m = data.meeting;
  const canEdit = role && !['view_only', 'management', 'team_member'].includes(role);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{m.title}</h1>
            <StatusBadge kind="meeting" value={m.status} />
          </div>
          <p className="text-sm text-muted-foreground md:text-[15px]">{labelFrom(MEETING_TYPES, m.meeting_type)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button asChild variant="outline" className="shadow-sm">
                <Link to={`/meetings/${m.id}/edit`}>Edit</Link>
              </Button>
              {m.status === 'draft' && (
                <Button className="shadow-sm" onClick={() => finalizeMut.mutate()} disabled={finalizeMut.isPending}>
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
        <Card className="transition-shadow hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Schedule & routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 text-sm">
            <Row label="When" value={new Date(m.scheduled_at).toLocaleString()} />
            <Row label="Location" value={m.location || '—'} />
            <Row label="Online link" value={m.online_meeting_link || '—'} />
            <Row label="Project / client" value={m.related_project_client || '—'} />
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <section className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agenda</h4>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{m.agenda || '—'}</p>
            </section>
            <section className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Discussion summary</h4>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{m.discussion_summary || '—'}</p>
            </section>
            <section className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key discussion points</h4>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{m.key_discussion_points || '—'}</p>
            </section>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
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
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Decisions</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
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
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell>
                    <StatusBadge kind="decision" value={d.status} />
                  </TableCell>
                  <TableCell>
                    <Link className="link-subtle text-sm" to={`/decisions/${d.id}`}>
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Action items</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
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
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground">{a.due_date}</TableCell>
                  <TableCell>
                    <StatusBadge kind="action" value={a.status} />
                  </TableCell>
                  <TableCell>
                    <Link className="link-subtle text-sm" to={`/actions/${a.id}`}>
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                }}
              />
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-border/60">
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
          </div>
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Activity history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.activity.map((log) => (
            <div
              key={log.id}
              className="relative border-l-2 border-primary/60 pl-4 text-sm before:absolute before:left-[-5px] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-primary"
            >
              <div className="font-medium text-foreground">{log.action}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!data.activity.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
