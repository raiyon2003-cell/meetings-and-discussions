export function PageLoading() {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center gap-8 py-12" role="status" aria-label="Loading">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="h-3 w-2/5 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-full animate-pulse rounded-md bg-muted/70" />
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted/60" />
      </div>
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
