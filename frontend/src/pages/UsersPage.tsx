import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  department_id: string | null;
  roles: { id: string; name: string; slug: string } | null;
  departments?: { id: string; name: string } | null;
};

export function UsersPage() {
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<UserRow[]>('/users');
      return data;
    },
    enabled: role === 'admin',
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string }>>('/roles');
      return data;
    },
    enabled: role === 'admin',
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string }>>('/departments');
      return data;
    },
    enabled: role === 'admin',
  });

  const patchMut = useMutation({
    mutationFn: async (payload: { id: string; role_id?: string; department_id?: string | null }) => {
      const { id, ...body } = payload;
      await api.patch(`/users/${id}`, body);
    },
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="Assign roles and departments. Changes apply immediately for the SegWitz directory."
      />

      <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2 pt-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="min-w-[160px]">Department</TableHead>
                  <TableHead className="min-w-[160px]">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users || []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <select
                        className="select-native w-full min-w-[140px] max-w-[220px]"
                        defaultValue={u.department_id ?? ''}
                        onChange={(e) =>
                          patchMut.mutate({
                            id: u.id,
                            department_id: e.target.value || null,
                          })
                        }
                      >
                        <option value="">—</option>
                        {(departments || []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="select-native w-full min-w-[140px] max-w-[220px]"
                        defaultValue={u.roles?.id ?? ''}
                        onChange={(e) =>
                          patchMut.mutate({
                            id: u.id,
                            role_id: e.target.value,
                          })
                        }
                      >
                        {(roles || []).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
