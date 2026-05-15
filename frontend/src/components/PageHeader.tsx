import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Small label above the title (e.g. section name). Omit for a cleaner header. */
  eyebrow?: string;
};

function PageHeaderInner({ title, description, actions, className, eyebrow }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 border-b border-border/50 pb-8 md:flex-row md:items-start md:justify-between md:gap-8',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <div className="inline-flex w-fit items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:bg-muted/25">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2rem] md:leading-tight">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const PageHeader = memo(PageHeaderInner);
