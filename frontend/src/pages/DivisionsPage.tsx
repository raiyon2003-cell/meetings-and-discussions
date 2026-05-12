import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function DivisionsPage() {
  const { data } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string; slug: string }>>('/divisions');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Divisions</h1>
        <p className="text-muted-foreground">Corporate divisions used for routing meetings and decisions.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Master list</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.slug}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
