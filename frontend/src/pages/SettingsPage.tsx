import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
          <CardDescription>Organization-wide preferences will land here in later phases.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Defaults are controlled via Supabase and the Express API. Contact your administrator for structural changes.
        </CardContent>
      </Card>
    </div>
  );
}
