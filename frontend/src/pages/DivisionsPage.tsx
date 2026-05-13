import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { Building2 } from 'lucide-react';

export function DivisionsPage() {
  const { data } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string; slug: string }>>('/divisions');
      return data;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Divisions"
        description="Corporate divisions used for routing meetings, decisions, and organizational reporting."
      />
      <Card className="overflow-hidden transition-shadow hover:shadow-card-hover">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60">
          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Master list</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2 pt-2">
          <div className="surface-table border-0 shadow-none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data || []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{d.slug}</TableCell>
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
