import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { canModifyMeeting } from '@/lib/meetingAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MEETING_TYPES, MEETING_STATUS } from '@/constants/enums';
import type { Meeting } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/PageHeader';
import { PageLoading } from '@/components/PageLoading';
import { MeetingAttendeesEditor, type AttendeeRow } from '@/components/MeetingAttendeesEditor';

const schema = z.object({
  title: z.string().min(1),
  meeting_type: z.string().min(1),
  scheduled_at: z.string().min(1),
  location: z.string().optional(),
  online_meeting_link: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || /^https?:\/\/.+/i.test(v), 'Enter a valid URL (https://…)'),
  division_id: z.string().uuid(),
  department_id: z.string().uuid(),
  related_project_client: z.string().optional(),
  owner_id: z.string().uuid(),
  agenda: z.string().optional(),
  discussion_summary: z.string().optional(),
  key_discussion_points: z.string().optional(),
  important_notes: z.string().optional(),
  concerns_raised: z.string().optional(),
  risks_identified: z.string().optional(),
  status: z.enum(['draft', 'finalized']).optional(),
});

type FormValues = z.infer<typeof schema>;

export function MeetingEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const isNew = !id;
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['meeting-detail', id],
    enabled: !isNew && Boolean(id),
    queryFn: async () => {
      const { data: res } = await api.get<{
        meeting: Meeting;
        attendees: Array<{ user_id: string; status: 'present' | 'absent' }>;
      }>(`/meetings/${id}`);
      return res;
    },
    staleTime: 30_000,
  });

  const meeting = detail?.meeting;

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string }>>('/divisions');
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string; division_id: string }>>('/departments');
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Array<{ id: string; full_name: string }>>('/users');
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      meeting_type: 'internal_management',
      scheduled_at: '',
      status: 'draft',
    },
  });

  useEffect(() => {
    if (isNew && profile?.id && users?.length) {
      form.setValue('owner_id', profile.id);
    }
  }, [isNew, profile?.id, users, form]);

  useEffect(() => {
    if (isNew) {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      form.setValue('scheduled_at', d.toISOString().slice(0, 16));
    }
  }, [isNew, form]);

  useEffect(() => {
    if (meeting) {
      form.reset({
        title: meeting.title,
        meeting_type: meeting.meeting_type,
        scheduled_at: meeting.scheduled_at.slice(0, 16),
        location: meeting.location ?? '',
        online_meeting_link: meeting.online_meeting_link ?? '',
        division_id: meeting.division_id,
        department_id: meeting.department_id,
        related_project_client: meeting.related_project_client ?? '',
        owner_id: meeting.owner_id,
        agenda: meeting.agenda ?? '',
        discussion_summary: meeting.discussion_summary ?? '',
        key_discussion_points: meeting.key_discussion_points ?? '',
        important_notes: meeting.important_notes ?? '',
        concerns_raised: meeting.concerns_raised ?? '',
        risks_identified: meeting.risks_identified ?? '',
        status: meeting.status,
      });
      setAttendees(
        (detail?.attendees || []).map((a) => ({
          user_id: a.user_id,
          status: a.status === 'absent' ? 'absent' : 'present',
        })),
      );
    }
  }, [meeting, detail?.attendees, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        location: values.location || null,
        online_meeting_link: values.online_meeting_link || null,
        related_project_client: values.related_project_client || null,
        agenda: values.agenda || null,
        discussion_summary: values.discussion_summary || null,
        key_discussion_points: values.key_discussion_points || null,
        important_notes: values.important_notes || null,
        concerns_raised: values.concerns_raised || null,
        risks_identified: values.risks_identified || null,
      };
      let meetingId: string;
      if (isNew) {
        const { data } = await api.post<Meeting>('/meetings', payload);
        meetingId = data.id;
      } else {
        const { data } = await api.patch<Meeting>(`/meetings/${id}`, payload);
        meetingId = data.id;
      }
      await api.put(`/meetings/${meetingId}/attendees`, { attendees });
      return { id: meetingId };
    },
    onSuccess: (row) => {
      toast.success(isNew ? 'Meeting created' : 'Meeting updated');
      void qc.invalidateQueries({ queryKey: ['meetings'] });
      void qc.invalidateQueries({ queryKey: ['meeting-detail', row.id] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate(isNew ? `/meetings/${row.id}` : `/meetings/${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(values: FormValues) {
    if (!isNew && !window.confirm('Save changes to this meeting?')) return;
    saveMutation.mutate(values);
  }

  const divisionId = form.watch('division_id');
  const deptOptions = (departments || []).filter((d) => d.division_id === divisionId);
  const canEdit = isNew || canModifyMeeting(profile, meeting);

  if (!isNew && detailLoading) return <PageLoading />;

  if (!isNew && meeting && !canEdit) {
    return (
      <Card className="border-destructive/30 bg-destructive/[0.06]">
        <CardHeader>
          <CardTitle className="text-destructive">You cannot edit this meeting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your role does not allow editing this record. Contact an admin or the meeting owner.
          </p>
          <Button asChild variant="outline">
            <Link to={`/meetings/${meeting.id}`}>Back to meeting</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={isNew ? 'New meeting' : 'Edit meeting'}
        description={
          isNew
            ? 'All fields align with the SegWitz operational record. Required fields must be complete before save.'
            : 'Update meeting details and participants. Unchanged fields are preserved on save.'
        }
        eyebrow={isNew ? 'Create' : 'Edit'}
      />

      {!isNew && meeting?.updated_at ? (
        <p className="-mt-4 text-xs text-muted-foreground">
          Last updated {new Date(meeting.updated_at).toLocaleString()}
        </p>
      ) : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label>Title</Label>
              <Input {...form.register('title')} />
              {form.formState.errors.title ? (
                <p className="text-xs text-red-600 dark:text-red-400">{form.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select className="select-native" {...form.register('meeting_type')}>
                {MEETING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled</Label>
              <Input type="datetime-local" {...form.register('scheduled_at')} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="select-native" {...form.register('status')}>
                {MEETING_STATUS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <select className="select-native" {...form.register('division_id')}>
                <option value="">Select…</option>
                {(divisions || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select className="select-native" {...form.register('department_id')}>
                <option value="">Select…</option>
                {deptOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <select className="select-native" {...form.register('owner_id')}>
                <option value="">Select…</option>
                {(users || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Related project / client</Label>
              <Input {...form.register('related_project_client')} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...form.register('location')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Online meeting link</Label>
              <Input {...form.register('online_meeting_link')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda & notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label>Agenda</Label>
              <Textarea {...form.register('agenda')} />
            </div>
            <div className="space-y-2">
              <Label>Discussion summary</Label>
              <Textarea {...form.register('discussion_summary')} />
            </div>
            <div className="space-y-2">
              <Label>Key discussion points</Label>
              <Textarea {...form.register('key_discussion_points')} />
            </div>
            <div className="space-y-2">
              <Label>Important notes</Label>
              <Textarea {...form.register('important_notes')} />
            </div>
            <div className="space-y-2">
              <Label>Concerns raised</Label>
              <Textarea {...form.register('concerns_raised')} />
            </div>
            <div className="space-y-2">
              <Label>Risks identified</Label>
              <Textarea {...form.register('risks_identified')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingAttendeesEditor
              users={users || []}
              value={attendees}
              onChange={setAttendees}
              disabled={saveMutation.isPending}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : isNew ? 'Create meeting' : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isNew ? '/meetings' : `/meetings/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
