import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ACTION_PRIORITY, ACTION_STATUS } from '@/constants/enums';
import type { ActionItem } from '@/types/models';
import { PageHeader } from '@/components/PageHeader';

const schema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    assigned_to: z.string().uuid(),
    due_date: z.string(),
    priority: z.string().optional(),
    status: z.string().optional(),
    meeting_id: z.union([z.string().uuid(), z.literal('')]).optional(),
    decision_id: z.union([z.string().uuid(), z.literal('')]).optional(),
    completion_notes: z.string().optional(),
  })
  .refine((d) => Boolean(d.meeting_id || d.decision_id), {
    message: 'Link to a meeting or a decision',
    path: ['meeting_id'],
  });

type FormValues = z.infer<typeof schema>;

export function ActionEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id;

  const { data: action } = useQuery({
    queryKey: ['action-edit', id],
    enabled: !isNew,
    queryFn: async () => {
      const { data: res } = await api.get<{ action: ActionItem }>(`/action-items/${id}`);
      return res.action;
    },
    staleTime: 30_000,
  });

  const { data: meetings } = useQuery({
    queryKey: ['meetings-short'],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Array<{ id: string; title: string }> }>('/meetings', { params: { limit: 100 } });
      return body.data;
    },
    staleTime: 60_000,
  });

  const { data: decisions } = useQuery({
    queryKey: ['decisions-short'],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Array<{ id: string; title: string }> }>('/decisions', { params: { limit: 100 } });
      return body.data;
    },
    staleTime: 60_000,
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
      priority: 'medium',
      status: 'not_started',
    },
  });

  useEffect(() => {
    if (action) {
      form.reset({
        title: action.title,
        description: action.description ?? '',
        assigned_to: action.assigned_to,
        due_date: action.due_date,
        priority: action.priority,
        status: action.status,
        meeting_id: action.meeting_id ?? '',
        decision_id: action.decision_id ?? '',
        completion_notes: action.completion_notes ?? '',
      });
    }
  }, [action, form]);

  const saveMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        meeting_id: values.meeting_id || null,
        decision_id: values.decision_id || null,
        description: values.description || null,
        completion_notes: values.completion_notes || null,
      };
      if (isNew) {
        const { data } = await api.post<ActionItem>('/action-items', payload);
        return data;
      }
      const { data } = await api.patch<ActionItem>(`/action-items/${id}`, payload);
      return data;
    },
    onSuccess: (row) => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['actions'] });
      if (isNew) navigate(`/actions/${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={isNew ? 'New action item' : 'Edit action item'}
        description="Define the task, owner, due date, and tracking fields. Assignees can update status where permitted."
      />

      <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Action</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register('title')} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register('description')} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Assigned to</Label>
                <select className="select-native" {...form.register('assigned_to')}>
                  {(users || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" {...form.register('due_date')} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select className="select-native" {...form.register('priority')}>
                  {ACTION_PRIORITY.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="select-native" {...form.register('status')}>
                  {ACTION_STATUS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Related meeting</Label>
              <select className="select-native" {...form.register('meeting_id')}>
                <option value="">—</option>
                {(meetings || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Related decision</Label>
              <select className="select-native" {...form.register('decision_id')}>
                <option value="">—</option>
                {(decisions || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saveMut.isPending}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
