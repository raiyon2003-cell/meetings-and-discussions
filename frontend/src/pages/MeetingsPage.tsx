import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Meeting } from '@/types/models';
import { labelFrom, MEETING_TYPES, MEETING_STATUS } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

export function MeetingsPage() {
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const canCreate = role && !['view_only', 'management', 'team_member'].includes(role);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['meetings', search, status],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Meeting[] }>('/meetings', {
        params: {
          search: search || undefined,
          status: status || undefined,
          sort: 'scheduled_at',
          order: 'desc',
          limit: 50,
        },
      });
      return body.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-muted-foreground">Create, finalize, and trace operational discussions.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/meetings/new">
              <Plus className="mr-2 h-4 w-4" />
              New meeting
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {MEETING_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Apply
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.title}</TableCell>
                  <TableCell>{labelFrom(MEETING_TYPES, m.meeting_type)}</TableCell>
                  <TableCell>{new Date(m.scheduled_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'finalized' ? 'success' : 'secondary'}>
                      {labelFrom(MEETING_STATUS, m.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link className="text-primary hover:underline" to={`/meetings/${m.id}`}>
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!data?.length && <div className="p-6 text-center text-muted-foreground">No meetings found.</div>}
        </div>
      )}
    </div>
  );
}
