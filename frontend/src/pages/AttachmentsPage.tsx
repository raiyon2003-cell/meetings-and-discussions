import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Paperclip } from 'lucide-react';

export function AttachmentsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Attachments"
        description="How files are stored and linked to meetings, decisions, and action items in SegWitz."
      />
      <Card className="transition-shadow hover:shadow-card-hover">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
            Supabase Storage
          </CardTitle>
          <CardDescription>
            Files are uploaded in context—open any meeting, decision, or action item and use the attachment panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-6 text-sm leading-relaxed text-muted-foreground">
          <p>Supported types include PDF, DOCX, XLSX, PPTX, ZIP, and common images.</p>
          <p>Maximum size per file: 50 MB (configured on the API and bucket).</p>
        </CardContent>
      </Card>
    </div>
  );
}
