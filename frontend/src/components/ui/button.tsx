import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-safe:active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:shadow-lg hover:shadow-primary/25',
        outline:
          'border border-input/90 bg-background/80 shadow-sm hover:border-primary/25 hover:bg-muted/80 hover:text-foreground hover:shadow',
        ghost: 'hover:bg-muted/90 hover:text-foreground',
        destructive: 'bg-red-600 text-white shadow-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
        secondary: 'bg-muted/90 text-foreground shadow-sm hover:bg-muted hover:shadow',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8 text-[15px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(variants({ variant, size, className }))} ref={ref as never} {...props} />;
  },
);
Button.displayName = 'Button';
