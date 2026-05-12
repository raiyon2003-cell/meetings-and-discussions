import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground">Assign roles and departments (Admin).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users || []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
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
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
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
        </CardContent>
      </Card>
    </div>
  );
}
