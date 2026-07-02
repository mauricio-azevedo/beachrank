import * as React from 'react';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Arena typographic roles.
 *
 * A single face (Plus Jakarta Sans) carries everything — headings and figures
 * at heavy weights, running text lighter. Every text on the platform resolves
 * to one of these roles; raw `text-*` utilities are reserved for genuine
 * one-offs.
 *
 * The ten roles: Display, Stat (sm/md/lg/xl), Title, Heading, Label, Body, Meta,
 * Overline — plus the action label, which lives on the Button primitive. Each
 * role reads its size, weight and tracking from the type-scale tokens in
 * globals.css — never hard-code them. Numbers use `tabular-nums` so stats stay
 * column-aligned; colour is always passed in via `className`.
 */

type RoleProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  asChild?: boolean;
};

/** The single anchoring figure on a screen — e.g. the rank `#5`. */
function Display({ className, asChild, ...props }: RoleProps<'div'>) {
  const Comp = asChild ? Slot.Root : 'div';
  return (
    <Comp
      data-slot="display"
      className={cn('font-display text-display tabular-nums', className)}
      {...props}
    />
  );
}

/**
 * Secondary figures — scores, ratings, ring values. `size="sm"` for the 16px
 * figures in dense rows, `size="lg"` for 26px, `size="xl"` for the 34px games
 * figure in the score stepper.
 */
function Stat({
  className,
  asChild,
  size = 'md',
  ...props
}: RoleProps<'div'> & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const Comp = asChild ? Slot.Root : 'div';
  const sizeClass =
    size === 'xl'
      ? 'text-stat-xl'
      : size === 'lg'
        ? 'text-stat-lg'
        : size === 'sm'
          ? 'text-stat-sm'
          : 'text-stat-md';

  return (
    <Comp
      data-slot="stat"
      className={cn('font-display tabular-nums', sizeClass, className)}
      {...props}
    />
  );
}

/** Screen / group title. */
function Title({ className, asChild, ...props }: RoleProps<'h1'>) {
  const Comp = asChild ? Slot.Root : 'h1';
  return <Comp data-slot="title" className={cn('font-display text-title', className)} {...props} />;
}

/** In-page section header — e.g. "Hoje". */
function Heading({ className, asChild, ...props }: RoleProps<'h2'>) {
  const Comp = asChild ? Slot.Root : 'h2';
  return (
    <Comp data-slot="heading" className={cn('font-display text-heading', className)} {...props} />
  );
}

/** Emphasized UI text at body size — tab labels, player names, separators. */
function Label({ className, asChild, ...props }: RoleProps<'span'>) {
  const Comp = asChild ? Slot.Root : 'span';
  return <Comp data-slot="label" className={cn('text-label', className)} {...props} />;
}

/** Running text — descriptions, inputs, primary body copy. */
function Body({ className, asChild, ...props }: RoleProps<'p'>) {
  const Comp = asChild ? Slot.Root : 'p';
  return <Comp data-slot="body" className={cn('text-body', className)} {...props} />;
}

/** Meta text — counts, dates, card micro text (±swing, initials). */
function Meta({ className, asChild, ...props }: RoleProps<'span'>) {
  const Comp = asChild ? Slot.Root : 'span';
  return <Comp data-slot="meta" className={cn('text-meta tabular-nums', className)} {...props} />;
}

/**
 * Uppercase overline that sits above a value — e.g. "SUA POSIÇÃO". `size="xs"`
 * (10px) for inline micro-chips such as the "Você" tag.
 */
function Overline({
  className,
  asChild,
  size = 'default',
  ...props
}: RoleProps<'div'> & { size?: 'default' | 'xs' }) {
  const Comp = asChild ? Slot.Root : 'div';
  return (
    <Comp
      data-slot="overline"
      className={cn(
        size === 'xs' ? 'text-overline-xs' : 'text-overline',
        'text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Inline dot separator between meta items — the round bolinha in "12 jogadores · 30
 * partidas". Use it everywhere a `·` once joined counts or labels so every meta
 * line reads the same. Carries its own `mx-tight` to self-space inside running
 * text; inside a gap-spaced flex row pass `className="mx-0"`.
 */
function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mx-tight inline-block size-[3px] shrink-0 rounded-full bg-faint-foreground align-middle',
        className,
      )}
    />
  );
}

export { Display, Stat, Title, Heading, Label, Body, Meta, Overline, Dot };
