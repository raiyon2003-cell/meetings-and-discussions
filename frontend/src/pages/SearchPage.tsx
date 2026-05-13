import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActionItem, Decision, Meeting } from '@/types/models';
import { PageHeader } from '@/components/PageHeader';

export function SearchPage() {
  const [filters, setFilters] = useState({
    keyword: '',
    division_id: '',
    department_id: '',
    meeting_type: '',
    decision_status: '',
    action_status: '',
    date_from: '',
    date_to: '',
  });

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['global-search', filters],
    queryFn: async () => {
      const { data: res } = await api.get<{ meetings: Meeting[]; decisions: Decision[]; actions: ActionItem[] }>(
        '/search',
        {
          params: {
            ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
            limit: 25,
          },
        },
      );
      return res;
    },
    enabled: false,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Global search"
        description="Search meetings, decisions, and actions with structured filters across the repository."
      />

      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <Input
            placeholder="Keyword"
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            placeholder="Division UUID"
            value={filters.division_id}
            onChange={(e) => setFilters((f) => ({ ...f, division_id: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            placeholder="Department UUID"
            value={filters.department_id}
            onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            placeholder="Meeting type (slug)"
            value={filters.meeting_type}
            onChange={(e) => setFilters((f) => ({ ...f, meeting_type: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            placeholder="Decision status"
            value={filters.decision_status}
            onChange={(e) => setFilters((f) => ({ ...f, decision_status: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            placeholder="Action status"
            value={filters.action_status}
            onChange={(e) => setFilters((f) => ({ ...f, action_status: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            className="bg-background/80"
          />
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            className="bg-background/80"
          />
          <div className="md:col-span-2">
            <Button type="button" className="shadow-sm" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Searching…' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Meetings ({data.meetings.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pt-4 text-sm">
              {data.meetings.map((m) => (
                <div key={m.id} className="rounded-md border border-transparent px-1 py-1.5 transition-colors hover:border-border/80 hover:bg-muted/30">
                  <Link className="link-subtle font-medium" to={`/meetings/${m.id}`}>
                    {m.title}
                  </Link>
                </div>
              ))}
              {!data.meetings.length && <p className="text-sm text-muted-foreground">No results</p>}
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Decisions ({data.decisions.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pt-4 text-sm">
              {data.decisions.map((d) => (
                <div key={d.id} className="rounded-md border border-transparent px-1 py-1.5 transition-colors hover:border-border/80 hover:bg-muted/30">
                  <Link className="link-subtle font-medium" to={`/decisions/${d.id}`}>
                    {d.title}
                  </Link>
                </div>
              ))}
              {!data.decisions.length && <p className="text-sm text-muted-foreground">No results</p>}
            </CardContent>
          </Card>
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-base">Actions ({data.actions.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pt-4 text-sm">
              {data.actions.map((a) => (
                <div key={a.id} className="rounded-md border border-transparent px-1 py-1.5 transition-colors hover:border-border/80 hover:bg-muted/30">
                  <Link className="link-subtle font-medium" to={`/actions/${a.id}`}>
                    {a.title}
                  </Link>
                </div>
              ))}
              {!data.actions.length && <p className="text-sm text-muted-foreground">No results</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
