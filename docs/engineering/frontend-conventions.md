# Frontend Conventions (Next.js / `web`)

Observed conventions in `web/src` (verified 2026-06-17). Descriptive companion to
[`../code-organization.md`](../code-organization.md).

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui
(`radix-luma` style), lucide icons. Mobile-first, dark theme by default,
Portuguese copy (`lang="pt-BR"`).

---

## 1. Directory layout

```txt
web/src/
  app/        routes (page.tsx, loading.tsx, layout.tsx) — thin
  components/ globally shared UI (app-shell, bottom-nav, ui/* shadcn primitives)
  features/   product features (the bulk of the code)
  lib/        infrastructure (api-client, auth, utils, route-policy, hrefs)
  providers/  React context providers (navigation)
  types/      cross-feature API contract types (api.ts)
```

`lib/` must not import from `features/`. Feature-specific code never goes in the
global `components/`.

## 2. Feature structure

Each feature has a **root component at the feature root** (`profile.tsx`,
`group-detail.tsx`) and only the subfolders it needs:

```txt
features/<feature>/
  <feature>.tsx           root component
  api/<x>.api.ts          API calls (functions only)
  components/             reusable pieces within the feature
  sections/              larger page blocks
  tabs/<tab>/            subfeatures with their own api/sections/types
  types/<x>.type.ts      one important type per file
  enums/<x>.enum.ts      closed unions (`type X = 'A' | 'B'`)
  helpers/<x>.helper.ts  pure functions
```

File names are kebab-case with suffix; components are PascalCase; named exports
only (except route files, which need `default`).

## 3. Routes (`app/`)

- `page.tsx` is a thin (usually server) component that fetches and renders a
  feature component inside `AppShell`. Dynamic params/searchParams arrive as
  Promises and are `await`ed.
- `'use client'` is pushed down to the feature/component that actually needs
  state, effects, browser APIs, or event handlers — not put on route files.
- `loading.tsx` co-locates a destination-shaped skeleton (wrapped in `AppShell`
  with the same chrome). See
  [`../design/loading-and-skeletons.md`](../design/loading-and-skeletons.md).

## 4. Data fetching & state

- **No React Query / SWR.** Server components `await` API functions directly and
  pass data as props to client components.
- Client components fetch in `useEffect` with a `'loading' | 'ready' | 'error'`
  state machine and an `isCurrent` flag to ignore stale responses.
- Every API call passes `cache: 'no-store'`.
- Standard render branches: loading → skeleton, error → error state, empty →
  empty state, else content.

## 5. API layer

- `lib/api-client.ts` exposes `apiRequest<T>(path, { token, body, ...opts })`:
  sets JSON headers, `Authorization: Bearer <token>` when provided, throws
  `Error(message)` on non-2xx (message extracted from the JSON body, arrays
  joined). Base URL from `NEXT_PUBLIC_API_URL`.
- **Expired-session handling**: before sending (and on a `401` afterwards), if the
  supplied token is past its `exp` (`isAccessTokenExpired`, `lib/auth.ts`),
  `apiRequest` calls `triggerSessionExpired()` — which clears the token and sends the
  user to `/login` with a "sessão expirou" notice (handler registered by
  `SessionExpiryRedirect`). The `exp` check is the discriminator: a `401` with a
  still-valid token is a business error (e.g. wrong current password) and must
  **not** log the user out. There is no refresh token — the user re-authenticates.
- `*.api.ts` files contain only functions named `get*/create*/update*/delete*`,
  typed with shared/feature types. No UI, no formatting, no `localStorage`.
- The JWT is passed **explicitly** into each call — it is not auto-injected.

```ts
export function getProfileMatches(token: string): Promise<ProfileMatchListItem[]> {
  return apiRequest<ProfileMatchListItem[]>('/me/profile/matches', { token, cache: 'no-store' });
}
```

## 6. Auth on the client

- `lib/auth.ts`: token in `localStorage` (`arena_access_token`), SSR-guarded
  (`typeof window === 'undefined'`), JWT decoded manually from the base64 payload
  to read `sub`. No auth library.

## 7. Types

- `types/api.ts` hand-mirrors the backend contract (`User`, `Group`,
  `GroupMember`, `Match`, `MatchPlayer`, …). **Keep it in sync with the API by
  hand** — there is no codegen or shared package.
- Features prefer lightweight view-model types over reusing full API types when
  they only need a subset.
- Enums are union types in `enums/*.enum.ts`
  (`type ProfileMatchResult = 'WIN' | 'LOSS'`), not the `enum` keyword.

## 8. Shared chrome, navigation, routing helpers

- `AppShell` wraps screens, enforces `lib/route-policy.ts` (access kind +
  chrome flags + group membership/role checks — UX only), renders `AppTopBar` +
  `BottomNav`.
- `providers/navigation-provider.tsx` keeps a sessionStorage nav stack for safe
  back behavior (`safeBack(fallbackHref)`); `navigation-tracker.tsx` registers the
  current href.
- `lib/internal-href.ts` rejects open redirects (only `/…`, not `//…` or external);
  `lib/search-params.ts` normalizes array params.

## 9. UI & styling

- shadcn/ui primitives in `components/ui/*` (configured by `components.json`).
- `cn()` from `lib/utils.ts` (`clsx` + `tailwind-merge`) for class composition.
- Tailwind v4 via `@tailwindcss/postcss`; theme tokens (oklch CSS variables) in
  `app/globals.css`; `dark` class on `<body>`.
- **Spacing follows the 8-point grid via the semantic ladder** (`gap-snug`,
  `space-y-section`, `mt-comfortable`, …); see [`../design/spacing.md`](../design/spacing.md).
  Gaps and margins use the ladder — no `.5` Tailwind steps or arbitrary `[px]` spacing.
  Padding stays numeric Tailwind.
- Loading skeletons use `animate-pulse` on muted blocks that match the final
  layout, with `role="status"` / `aria-busy` / `sr-only` text. No visible
  "Carregando…" text.
- **UI derived from a member's data has a single source.** A member's avatar
  (`MemberAvatar`, `components/ui/member-avatar.tsx`) and role badge
  (`memberRoleTag`, `lib/member-role.ts`) are defined once and reused everywhere a
  member is shown (ranking, match cards, drawers, pickers). Don't re-inline
  `userId === null` styling or role/status labels per screen — that's what let the
  same player read "Convidado" on one screen and "Sem conta" on another. The label is
  UI copy derived from data the client already has; keep it in a shared frontend
  helper, not as a field on an API response (routes stay use-case-shaped, not
  UI-shaped — see `backend-conventions.md`).
- **A shared component owns all its states.** The same single-source rule extends to
  the field/header/row primitives: build the error, loading, empty, disabled, and busy
  states into the shared piece (e.g. `SheetField`'s built-in error state, the one
  `DrawerActionHeader`) so every caller gets them — don't hand-roll a near-duplicate
  that only styles the happy path. This is the Code Quality Baseline in `AGENTS.md`;
  open gaps are tracked in `code-quality-backlog.md`.

## 10. Product/UI quality bar

Follow the bars in `AGENTS.md` — the Product/UI Quality Bar (ship-ready copy, no
implementation/architecture leaking into UI, intentional loading/empty/error states,
mobile-first, elegant) and the Code Quality Baseline (reuse the existing primitive,
ship every state, single-source derived UI). Tooling: `npm run dev`, `npm run build`,
`npm run lint`.
</content>
