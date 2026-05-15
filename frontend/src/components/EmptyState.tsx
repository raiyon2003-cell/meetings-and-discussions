import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br from-primary/[0.07] via-border/40 to-muted/30 p-[1px] shadow-sm dark:from-primary/10 dark:via-border/30',
        className,
      )}
    >
      <div className="flex flex-col items-center justify-center rounded-[11px] border border-dashed border-border/60 bg-muted/15 px-6 py-14 text-center dark:bg-background/40">
        {Icon ? (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-card/80 text-muted-foreground shadow-sm">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        ) : null}
        <p className="text-base font-semibold tracking-tight text-foreground">{title}</p>
        {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  );
}
