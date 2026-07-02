import { AppShell } from '@/components/app-shell';

// Welcome-shaped skeleton for the chrome-less invite landing.
export default function InviteLoading() {
  return (
    <AppShell chrome={{ topBar: false, bottomNav: false }}>
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-[78dvh] flex-col"
      >
        <span className="sr-only">Carregando convite</span>

        <div className="flex flex-1 flex-col justify-center">
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted" />
          <div className="mt-7 h-[4.5rem] animate-pulse rounded-2xl bg-muted/80" />
        </div>

        <div className="h-12 w-full animate-pulse rounded-pill bg-muted" />
      </div>
    </AppShell>
  );
}
