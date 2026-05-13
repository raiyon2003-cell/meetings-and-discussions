import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'neutral'
    | 'info';
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground shadow-sm',
        variant === 'secondary' && 'border-transparent bg-muted text-foreground dark:bg-muted/80',
        variant === 'outline' &&
          'border-border/80 bg-background/80 text-foreground dark:border-border dark:bg-card/50',
        variant === 'success' &&
          'border-transparent bg-emerald-600/90 text-white shadow-sm dark:bg-emerald-600',
        variant === 'warning' &&
          'border-transparent bg-amber-500/95 text-white shadow-sm dark:bg-amber-600',
        variant === 'destructive' && 'border-transparent bg-red-600 text-white shadow-sm dark:bg-red-700',
        variant === 'neutral' &&
          'border-border/60 bg-muted/60 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground',
        variant === 'info' &&
          'border-transparent bg-sky-600/90 text-white shadow-sm dark:bg-sky-700',
        className,
      )}
      {...props}
    />
  );
}
