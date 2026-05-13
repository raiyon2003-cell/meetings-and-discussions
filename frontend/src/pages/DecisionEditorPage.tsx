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
import { DECISION_STATUS } from '@/constants/enums';
import type { Decision } from '@/types/models';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/PageHeader';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  meeting_id: z.union([z.string().uuid(), z.literal('')]).optional(),
  division_id: z.string().uuid(),
  department_id: z.string().uuid(),
  related_project_client: z.string().optional(),
  owner_id: z.string().uuid(),
  approved_by: z.union([z.string().uuid(), z.literal('')]).optional(),
  date_decided: z.string().optional(),
  impact_area: z.string().optional(),
  remarks: z.string().optional(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function DecisionEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const isNew = !id;

  const { data: decision } = useQuery({
    queryKey: ['decision-edit', id],
    enabled: !isNew,
    queryFn: async () => {
      const { data: res } = await api.get<{ decision: Decision }>(`/decisions/${id}`);
      return res.decision;
    },
    staleTime: 30_000,
  });

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

  const { data: meetings } = useQuery({
    queryKey: ['meetings-short'],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Array<{ id: string; title: string }> }>('/meetings', { params: { limit: 100 } });
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
      title: '',
      description: '',
      status: 'proposed',
    },
  });

  useEffect(() => {
    if (decision) {
      form.reset({
        title: decision.title,
        description: decision.description,
        meeting_id: decision.meeting_id ?? '',
        division_id: decision.division_id,
        department_id: decision.department_id,
        related_project_client: decision.related_project_client ?? '',
        owner_id: decision.owner_id,
        approved_by: decision.approved_by ?? '',
        date_decided: decision.date_decided,
        impact_area: decision.impact_area ?? '',
        remarks: decision.remarks ?? '',
        status: decision.status,
      });
    }
  }, [decision, form]);

  useEffect(() => {
    if (isNew && profile?.id && users?.length) {
      form.setValue('owner_id', profile.id);
      form.setValue('date_decided', new Date().toISOString().slice(0, 10));
    }
  }, [isNew, profile?.id, users, form]);

  const divId = form.watch('division_id');
  const deptOpts = (departments || []).filter((d) => d.division_id === divId);

  const saveMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        meeting_id: values.meeting_id || null,
        approved_by: values.approved_by || null,
        related_project_client: values.related_project_client || null,
        impact_area: values.impact_area || null,
        remarks: values.remarks || null,
      };
      if (isNew) {
        const { data } = await api.post<Decision>('/decisions', payload);
        return data;
      }
      const { data } = await api.patch<Decision>(`/decisions/${id}`, payload);
      return data;
    },
    onSuccess: (row) => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['decisions'] });
      if (isNew) navigate(`/decisions/${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={isNew ? 'New decision' : 'Edit decision'}
        description="Capture the decision record, ownership, and approval path in line with governance standards."
      />

      <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Decision</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label>Title</Label>
              <Input {...form.register('title')} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register('description')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Link to meeting (optional)</Label>
              <select className="select-native" {...form.register('meeting_id')}>
                <option value="">None</option>
                {(meetings || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
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
                {deptOpts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <select className="select-native" {...form.register('owner_id')}>
                {(users || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Approved by</Label>
              <select className="select-native" {...form.register('approved_by')}>
                <option value="">—</option>
                {(users || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date decided</Label>
              <Input type="date" {...form.register('date_decided')} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="select-native" {...form.register('status')}>
                {DECISION_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Impact area</Label>
              <Input {...form.register('impact_area')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Related project / client</Label>
              <Input {...form.register('related_project_client')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea {...form.register('remarks')} />
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
