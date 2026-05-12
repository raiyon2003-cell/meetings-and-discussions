import { cn } from '@/lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {   variant?: 'default' | 'outline' | 'secondary' | 'success' | 'warning' | 'destructive' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-muted text-foreground',
        variant === 'outline' && 'text-foreground',
        variant === 'success' && 'border-transparent bg-emerald-600 text-white',
        variant === 'warning' && 'border-transparent bg-amber-500 text-white',
        variant === 'destructive' && 'border-transparent bg-red-600 text-white',
        className,
      )}
      {...props}
    />
  );
}
