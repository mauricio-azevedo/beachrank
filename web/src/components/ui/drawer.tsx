'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TOUCH_TARGET_48 } from '@/lib/touch-target';
import { Meta } from '@/components/ui/text';

/**
 * Bottom-sheet drawer (vaul). Tuned for the Arena dark surfaces: a dim overlay,
 * a rounded `--radius-sheet` top, an inset hairline, and a grabber. The sheet
 * leaves a peek at the top so the page behind stays visible, matching the
 * approved match-compose prototype.
 */

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

// Stacks a second sheet on top of an open drawer: vaul scales the parent back and
// animates this one up/down. Must be rendered inside the parent Drawer's subtree.
function DrawerNested({ ...props }: React.ComponentProps<typeof DrawerPrimitive.NestedRoot>) {
  return <DrawerPrimitive.NestedRoot data-slot="drawer-nested" {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  size = 'full',
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  // `full` fills the sheet to the standard peek height; `fit` hugs its content
  // (capped at the same height) for short sheets like a player peek.
  size?: 'full' | 'fit';
}) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-sheet bg-background text-foreground shadow-float outline-none',
          size === 'fit' ? 'h-auto max-h-[calc(100%-3.5rem)]' : 'h-[calc(100%-3.5rem)]',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 h-1.5 w-9 shrink-0 rounded-full bg-border-accent"
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('flex shrink-0 flex-col gap-1.5 px-4', className)}
      {...props}
    />
  );
}

// `pinned` (default) sticks the footer to the sheet bottom (mt-auto), as a sibling
// of the scroll area. `pinned={false}` makes it a normal in-flow block to drop at
// the end of the scroll content — so the action area scrolls with the fields.
function DrawerFooter({
  className,
  pinned = true,
  ...props
}: React.ComponentProps<'div'> & { pinned?: boolean }) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('flex flex-col gap-2 px-4', pinned && 'mt-auto shrink-0', className)}
      {...props}
    />
  );
}

// The single sheet header action bar. A left action (back chevron or "Cancelar"),
// a centered title (+ optional subtitle), and a right action ("Salvar"). Empty
// slots keep their min-width so the title stays optically centered. Use this for
// every drawer header so back/cancel/save read and behave identically everywhere.
type DrawerHeaderBack = { kind: 'back'; onClick: () => void; label?: string; disabled?: boolean };
type DrawerHeaderCancel = {
  kind: 'cancel';
  onClick: () => void;
  label?: string;
  disabled?: boolean;
};
type DrawerHeaderSave = {
  kind: 'save';
  onClick: () => void;
  label?: string;
  busyLabel?: string;
  disabled?: boolean;
  busy?: boolean;
};

function DrawerActionHeader({
  left,
  title,
  subtitle,
  right,
  // `sm` shrinks the title (16px) so a longer heading — e.g. "Adicionar convidados"
  // — fits the centered slot without truncating between the side actions.
  titleSize = 'default',
}: {
  left?: DrawerHeaderBack | DrawerHeaderCancel;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: DrawerHeaderSave;
  titleSize?: 'default' | 'sm';
}) {
  return (
    <div className="flex h-[52px] shrink-0 items-center justify-between gap-2 px-3">
      <div className="flex min-w-16 justify-start">
        {left && <DrawerHeaderLeft action={left} />}
      </div>

      <div className="min-w-0 flex-1 text-center">
        <DrawerTitle size={titleSize} className="truncate">
          {title}
        </DrawerTitle>
        {subtitle !== undefined && (
          <Meta className="truncate text-faint-foreground">{subtitle}</Meta>
        )}
      </div>

      <div className="flex min-w-16 justify-end">
        {right && (
          <button
            type="button"
            onClick={right.onClick}
            disabled={right.disabled || right.busy}
            className={cn(
              'text-label font-bold text-brand transition-opacity active:opacity-60 disabled:opacity-40',
              TOUCH_TARGET_48,
            )}
          >
            {right.busy ? (right.busyLabel ?? 'Salvando…') : (right.label ?? 'Salvar')}
          </button>
        )}
      </div>
    </div>
  );
}

function DrawerHeaderLeft({ action }: { action: DrawerHeaderBack | DrawerHeaderCancel }) {
  if (action.kind === 'cancel') {
    return (
      <button
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        className={cn(
          'text-label text-muted-foreground transition-opacity active:opacity-60 disabled:opacity-40',
          TOUCH_TARGET_48,
        )}
      >
        {action.label ?? 'Cancelar'}
      </button>
    );
  }

  // Back is always chevron-only (matches the design); `label` feeds the aria-label,
  // not visible text, so every back affordance reads the same across drawers.
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label ?? 'Voltar'}
      className={cn(
        'flex items-center text-brand transition-opacity active:opacity-60 disabled:opacity-40',
        TOUCH_TARGET_48,
      )}
    >
      <ChevronLeft className="size-[22px]" strokeWidth={2.4} aria-hidden />
    </button>
  );
}

// Back-only header (chevron + centered title) for nested sheets that return to the
// one beneath (player picker, stub claim, …). Thin wrapper over DrawerActionHeader.
function DrawerBackHeader({
  onBack,
  title,
  subtitle,
  backLabel = 'Voltar',
}: {
  onBack: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backLabel?: string;
}) {
  return (
    <DrawerActionHeader
      left={{ kind: 'back', onClick: onBack, label: backLabel }}
      title={title}
      subtitle={subtitle}
    />
  );
}

function DrawerTitle({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title> & { size?: 'default' | 'sm' }) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        'font-display',
        size === 'sm' ? 'text-base font-extrabold tracking-[-0.01em]' : 'text-heading',
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-meta text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerNested,
  DrawerActionHeader,
  DrawerBackHeader,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
