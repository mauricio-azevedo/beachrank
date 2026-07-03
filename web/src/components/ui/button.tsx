import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TOUCH_TARGET_48 } from '@/lib/touch-target';

const btnHeightLg = 'h-12';
const btnHeightDefault = 'h-12';
// Estende a área de toque para no mínimo 48px (piso da plataforma) via pseudo-elemento,
// sem alterar o tamanho visual do botão. Opt-in pela prop `touchTarget`, nunca o padrão.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-pill border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-button hover:bg-primary/90',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-input/30',
        secondary:
          'bg-surface text-secondary-foreground shadow-hairline hover:bg-surface-hover aria-expanded:bg-surface aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        danger:
          'bg-danger text-danger-foreground shadow-danger hover:bg-danger/90 focus-visible:ring-danger/30',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: `h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 ${btnHeightDefault}`,
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: `h-10 gap-1.5 px-4 text-action font-bold [&_svg]:[stroke-width:2.6] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 ${btnHeightLg}`,
        icon: 'size-12',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  touchTarget = false,
  loading,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    touchTarget?: boolean;
    // When defined, a spinner fades in/out at the trailing edge while the label
    // stays put (the spinner is absolutely positioned, so it never shifts text).
    // Skipped for `asChild` since Slot requires a single child.
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  const showSpinnerSlot = loading !== undefined && !asChild;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        buttonVariants({ variant, size }),
        touchTarget && TOUCH_TARGET_48,
        showSpinnerSlot && 'relative',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {showSpinnerSlot ? (
        <>
          {children}
          <ButtonSpinner loading={loading} />
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

// Trailing-edge busy spinner, single-sourced so plain Buttons and `asChild`
// surfaces (e.g. AlertDialogAction) share one treatment: a spinner that fades
// in at the inline-end while the label stays put — never shifting the text.
function ButtonSpinner({ loading }: { loading: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 right-3 flex items-center transition-opacity duration-200',
        loading ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Loader2 className={cn('size-[1.125rem]', loading && 'animate-spin')} />
    </span>
  );
}

export { Button, ButtonSpinner, buttonVariants };
