import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Settings"
        description="Workspace preferences and operational defaults for your organization."
      />
      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
            Application
          </CardTitle>
          <CardDescription>Organization-wide preferences will land here in later phases.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
          Defaults are controlled via Supabase and the Express API. Contact your administrator for structural changes.
        </CardContent>
      </Card>
    </div>
  );
}
