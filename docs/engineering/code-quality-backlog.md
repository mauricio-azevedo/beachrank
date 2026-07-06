# Code Quality Backlog

Known consistency / DRY / completeness debt — the gap between today's code and the
[Code Quality Baseline](../../AGENTS.md) (`AGENTS.md`). This is a **living, opportunistic** list:
fold an item in when you next touch the files it names, not as a standalone refactor. Per "local by
default, shared by necessity" (`code-organization.md`), extract a shared primitive on the second or
third real use — several items below have already crossed that line.

The two primitives built for the settings sheet are the model the rest should converge on:
`components/ui/sheet-field.tsx` (`SheetField` / `SheetPasswordField` — a field with its error state
built in) and `components/ui/drawer.tsx` (`DrawerActionHeader` — one header action bar).

## High — real duplication or a missing user-facing state

- **Inlined form fields → a card-capable shared field.** `features/auth/components/login-form.tsx`,
  `features/auth/components/register-form.tsx`, and `features/groups/components/create-group-form.tsx`
  hand-roll `<Label>`+`<Input>`(+`<Textarea>`) with ad-hoc error text. `SheetField` already solves
  this for sheets; it (or a sibling) should cover card forms too, so every field gets the same
  label / error tint / inline-alert / message treatment. (A `SheetTextarea` variant covers
  create-group's description.)
- **Inconsistent error UX (5 styles).** Form-level `text-destructive` `<p>` (login, register,
  create-group, `invite-accept-client`) vs centered `text-danger` `<Meta>`
  (edit-profile, password, `match-drawer`) vs `text-tag-warn` `<Meta>` (`claim-offer-client`)
  vs the field-level treatment now in `SheetField`.
  Standardize: field-level where the error maps to a field; one danger form-level fallback
  otherwise. `text-tag-warn` is for warnings, not errors.
- **Missing loading / error / empty states.** `features/members/member-profile-drawer.tsx` and
  `features/claim-offers/components/claim-offer-client.tsx` show bare error text with no retry.
  Compare the complete pattern in `features/groups/components/my-groups-list.tsx` (skeleton +
  error card + empty state).

## Medium — duplicated logic / divergent treatment

- **Duplicated submit/loading/error machine (~6 forms).** The same `useState` error + `isSubmitting`
  - try/catch/finally lives in login, register, create-group, edit-profile, password,
    `claim-offer-client`. Extract a `useFormSubmit` hook.
- **Duplicated auth/token plumbing.** `getAccessToken()` → call → `setAccessToken(result.accessToken)`
  is copy-pasted across the same forms; fold into the submit hook or a small wrapper.
- **Real-time field guidance is one-off.** `password-view`'s `PasswordGuidance` (live, colored) is
  the good pattern; auth/create-group only validate on submit.
- **Info/warn explainer row duplicated.** The `Info` icon + `Meta` row exists boxed/warn in
  `member-profile-drawer.tsx` and bare/muted in `invite-sheet.tsx` (back-to-back in the same flow);
  at the next touch, extract an `InfoRow` with tone + boxed/plain variants.
- **Group-detail tab state is triple-tracked.** `activeTab` (URL prop) + `selectedTab` +
  `syncedTab` mirror in `group-detail.tsx`; collapses to `pendingTab ?? activeTab` with a
  render-time clear.
- **`AddGuestsView` prop-drills 9 values** (`group-members-drawer.tsx`) for a single call site;
  inline it back into the view machine or pass one flow object when next touched.

## Low — cosmetic / premature to share

- **Settings menu `Row`** (`features/profile/settings/settings-menu-view.tsx`) is a local
  icon+label+chevron helper. The members "Convidar" and groups rows diverge in shape/context, so
  this is **correctly local for now** — only promote to a shared `MenuRow` when a genuinely matching
  second use appears.
- **Custom action buttons** (logout row, pill form buttons) use bespoke classes rather than
  `<Button>`; revisit if a `danger` button variant is added.
- **Off-ladder gaps in the invite surfaces.** `gap-2.5` (`invite-sheet.tsx` explainer/link rows)
  and `gap-3.5` (`group-members-drawer.tsx` ChooserOption) sit outside the spacing ladder
  (frontend-conventions §9); move to `gap-snug`/`gap-base` on the next pass over these files.
- **`isEmpty` prop on `GroupSummaryCard` is derivable** from the `matches` prop it already
  receives; derive inside the card to keep one source of truth.
