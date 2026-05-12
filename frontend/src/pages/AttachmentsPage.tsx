import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AttachmentsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Attachments</h1>
      <Card>
        <CardHeader>
          <CardTitle>Supabase Storage</CardTitle>
          <CardDescription>
            Files are uploaded in context—open any meeting, decision, or action item and use the attachment panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Supported types include PDF, DOCX, XLSX, PPTX, ZIP, and common images.</p>
          <p>Maximum size per file: 50 MB (configured on the API and bucket).</p>
        </CardContent>
      </Card>
    </div>
  );
}
