import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, Calendar, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Meeting } from '@/types/models';
import { labelFrom, MEETING_TYPES, MEETING_STATUS } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { canModifyMeeting, canCreateMeeting } from '@/lib/meetingAccess';
import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { PageLoading } from '@/components/PageLoading';

export function MeetingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const canCreate = canCreateMeeting(profile);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['meetings', debouncedSearch, status],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Meeting[] }>('/meetings', {
        params: {
          search: debouncedSearch || undefined,
          status: status || undefined,
          sort: 'scheduled_at',
          order: 'desc',
          limit: 50,
        },
      });
      return body.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 45_000,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meetings"
        description="Create, finalize, and trace operational discussions across the organization."
        actions={
          canCreate ? (
            <Button asChild className="shadow-sm">
              <Link to="/meetings/new">
                <Plus className="mr-2 h-4 w-4" />
                New meeting
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="filter-toolbar">
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-background/80"
        />
        <select className="select-native w-full sm:max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {MEETING_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {isLoading && !data ? (
        <PageLoading />
      ) : (
        <div className="surface-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-[200px] truncate font-medium lg:max-w-none">{m.title}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {labelFrom(MEETING_TYPES, m.meeting_type)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(m.scheduled_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind="meeting" value={m.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link className="link-subtle text-sm" to={`/meetings/${m.id}`}>
                        View
                      </Link>
                      {canModifyMeeting(profile, m) ? (
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2.5 shadow-sm">
                          <Link to={`/meetings/${m.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!data?.length && (
            <div className="border-t border-border/60 p-6">
              <EmptyState
                icon={Calendar}
                title="No meetings found"
                description="Try adjusting filters or create a new meeting to get started."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
