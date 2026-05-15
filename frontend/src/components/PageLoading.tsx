export function PageLoading() {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center gap-8 py-12" role="status" aria-label="Loading">
      <div className="relative h-11 w-11">
        <div className="absolute inset-0 rounded-full border-2 border-muted/80" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        <div
          className="h-3 w-2/5 rounded-md bg-gradient-to-r from-muted via-muted-foreground/12 to-muted bg-[length:200%_100%] motion-safe:animate-shimmer"
          aria-hidden
        />
        <div
          className="h-3 w-full rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] motion-safe:animate-shimmer [animation-delay:120ms]"
          aria-hidden
        />
        <div
          className="h-3 w-4/5 rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] motion-safe:animate-shimmer [animation-delay:240ms]"
          aria-hidden
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Loading…</p>
    </div>
  );
}
