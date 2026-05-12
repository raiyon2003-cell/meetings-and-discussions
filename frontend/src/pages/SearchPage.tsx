import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActionItem, Decision, Meeting } from '@/types/models';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global search</h1>
        <p className="text-muted-foreground">Search meetings, decisions, and actions with structured filters.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Keyword"
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
          />
          <Input
            placeholder="Division UUID"
            value={filters.division_id}
            onChange={(e) => setFilters((f) => ({ ...f, division_id: e.target.value }))}
          />
          <Input
            placeholder="Department UUID"
            value={filters.department_id}
            onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}
          />
          <Input
            placeholder="Meeting type (slug)"
            value={filters.meeting_type}
            onChange={(e) => setFilters((f) => ({ ...f, meeting_type: e.target.value }))}
          />
          <Input
            placeholder="Decision status"
            value={filters.decision_status}
            onChange={(e) => setFilters((f) => ({ ...f, decision_status: e.target.value }))}
          />
          <Input
            placeholder="Action status"
            value={filters.action_status}
            onChange={(e) => setFilters((f) => ({ ...f, action_status: e.target.value }))}
          />
          <Input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} />
          <Input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} />
          <div className="md:col-span-2">
            <Button type="button" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? 'Searching…' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Meetings ({data.meetings.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.meetings.map((m) => (
                <div key={m.id}>
                  <Link className="text-primary hover:underline" to={`/meetings/${m.id}`}>
                    {m.title}
                  </Link>
                </div>
              ))}
              {!data.meetings.length && <div className="text-muted-foreground">No results</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Decisions ({data.decisions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.decisions.map((d) => (
                <div key={d.id}>
                  <Link className="text-primary hover:underline" to={`/decisions/${d.id}`}>
                    {d.title}
                  </Link>
                </div>
              ))}
              {!data.decisions.length && <div className="text-muted-foreground">No results</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actions ({data.actions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.actions.map((a) => (
                <div key={a.id}>
                  <Link className="text-primary hover:underline" to={`/actions/${a.id}`}>
                    {a.title}
                  </Link>
                </div>
              ))}
              {!data.actions.length && <div className="text-muted-foreground">No results</div>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
