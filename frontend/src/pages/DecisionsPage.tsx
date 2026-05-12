import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Decision } from '@/types/models';
import { DECISION_STATUS, labelFrom } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

export function DecisionsPage() {
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const canCreate = role && !['view_only', 'management', 'team_member'].includes(role);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data } = useQuery({
    queryKey: ['decisions', search, status],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Decision[] }>('/decisions', {
        params: { search: search || undefined, status: status || undefined, limit: 50 },
      });
      return body.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Decision register</h1>
          <p className="text-muted-foreground">Authoritative record of what was decided and approved.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/decisions/new">
              <Plus className="mr-2 h-4 w-4" />
              New decision
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="h-10 max-w-xs rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {DECISION_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decided</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{labelFrom(DECISION_STATUS, d.status)}</Badge>
                </TableCell>
                <TableCell>{d.date_decided}</TableCell>
                <TableCell>
                  <Link className="text-primary hover:underline" to={`/decisions/${d.id}`}>
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
