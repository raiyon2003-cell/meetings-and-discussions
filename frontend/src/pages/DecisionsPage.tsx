import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Gavel } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Decision } from '@/types/models';
import { DECISION_STATUS } from '@/constants/enums';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { PageLoading } from '@/components/PageLoading';

export function DecisionsPage() {
  const role = useAuthStore((s) => s.profile?.role?.slug);
  const canCreate = role && !['view_only', 'management', 'team_member'].includes(role);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['decisions', debouncedSearch, status],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: Decision[] }>('/decisions', {
        params: { search: debouncedSearch || undefined, status: status || undefined, limit: 50 },
      });
      return body.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 45_000,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Decision register"
        description="Authoritative record of what was decided, approved, or deferred across SegWitz."
        actions={
          canCreate ? (
            <Button asChild className="shadow-sm">
              <Link to="/decisions/new">
                <Plus className="mr-2 h-4 w-4" />
                New decision
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-background/80"
        />
        <select className="select-native w-full sm:max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {DECISION_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="surface-table">
        {isLoading && !data ? (
          <PageLoading />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Decided</TableHead>
                <TableHead className="w-[88px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[220px] truncate font-medium">{d.title}</TableCell>
                  <TableCell>
                    <StatusBadge kind="decision" value={d.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{d.date_decided}</TableCell>
                  <TableCell>
                    <Link className="link-subtle text-sm" to={`/decisions/${d.id}`}>
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && data && !data.length && (
          <div className="border-t border-border/60 p-6">
            <EmptyState icon={Gavel} title="No decisions match" description="Clear filters or add a new decision to the register." />
          </div>
        )}
      </div>
    </div>
  );
}
