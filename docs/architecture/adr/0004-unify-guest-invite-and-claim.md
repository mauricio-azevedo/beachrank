# ADR 0004: Two guest-aware invites (open + closed), no generic join

## Status

Accepted — implemented.

The product concept lives in
[`../../product/guests-and-invites.md`](../../product/guests-and-invites.md). Open and
closed invites are live (backend, `/invites/:token` landing, and the invite sheets on
the group screen). The email-anchored claim this ADR supersedes kept only its
recipient-side flow (`/claim/:stubId`, for offers sent before the switch); the
admin-side anchoring UI is gone.

## Context

How a person comes to be represented in a group was split across three concepts that did not
connect:

- **Stub** — a `GroupMember` with `userId = null`, a name typed on the court so someone can be
  scored today without an account.
- **GroupInvite** — a generic link that only _joins_ the group as a brand-new member.
- **Email-anchored claim** — a separate flow where an admin anchors an email to a stub and the
  email's owner confirms to take it over.

Two front doors (the generic invite and the typed-on-court stub) could represent the same real
person twice. Reconciling them required a **merge**, which is the expensive, partly-blocked
operation: it re-points match history and is refused when the two memberships ever shared a
match (`@@unique([matchId, groupMemberId])` makes the same person appearing twice in one match
impossible). Duplicates were designed in; merge existed only to clean up after them.

The decisive observation: a group will, in practice, **share one link in its chat**. If that
link is **generic** (guest-blind), every existing guest who clicks it joins as a _second_
membership — a guaranteed duplicate. So the mass link cannot be generic; it must identify the
person against the guests that already exist. The claim's old identity anchor — an admin-set
**email** — was also mutable and unverified. We also considered admin **user search** and a
single self-identify link; both pointed at moving identification to the person.

## Decision

Make **every invite guest-aware**, and offer two of them that share one recognition screen:

- **Open guest invite** — the group's single shareable link. The person sees the list of
  unclaimed guests (**name + avatar only**, no history up front), **self-identifies**, and is
  taken to the recognition screen; or chooses **"none of these — just join"** to become a new
  member. The link is **viewable without login**; login/signup happens only at the **commit**.
- **Closed guest invite** — a link an admin generates for **one** guest and sends to that
  person; it **deep-links straight to that guest's recognition screen** (no roster) — an
  addressed "this is you" gift. It is the open invite **pre-aimed at one guest**.

Concretely:

- **Remove the email anchor, the admin user search, and the generic guest-blind join link.**
  The open invite's "just join" branch _is_ the join, with self-identification in front of it —
  and that step is what prevents the duplicate.
- Both invites are **reusable until taken over** and **not revocable** (V1); an already-taken
  or deleted target **falls back gracefully** to the open list / "join as new".
- **Self-identification is the consent**; the **shared-match block** is the hard auto-reject;
  the **admin is notified (actionably — one-tap revert)** and can **revert** a take-over.
- **`stub` is renamed `guest`** (convidado) across product and code.

## Consequences

### Positive

- **Duplicates are avoided at the source.** The mass link is guest-aware, so a person picks
  their existing guest instead of creating a second membership; merge becomes a rare exception.
- **The mutable email anchor and its whole state machine disappear** — **less UI than today**,
  not more.
- **open and closed are nearly free together:** they share one recognition/claim core, so
  closed is the open invite minus the picker.
- **The gift hooks before friction:** the recognition screen (history) is shown pre-login;
  authentication is deferred to the commit.

### Negative / trade-offs

- **The open list is visible to any link-holder (no login to browse), and take-over is
  self-served.** Showing only name + avatar limits the leak, but names are visible.
  Impersonation is bounded by the shared-match block, the actionable admin notification, and
  admin revert — **accepted for small, trusted groups.** The worst case (an impostor takes a
  high-ranked guest, leaving the real owner to join as a duplicate) is **recoverable** via
  admin revert + merge, not prevented. Identity verification stays out of scope.
- **A narrow race-duplicate is accepted:** someone joins as new just before being typed as a
  guest on court; resolved by merge later.
- **The invites are unrevocable for now** — if a link leaks, anyone with it can join. Link
  rotation is future work.
- **Requires a migration** when implemented: drop `claimEmail` / `claimEmailStatus` /
  `claimEmailNotifiedAt` and the registration hook, retire the `CLAIM_OFFER*` notifications and
  the generic join destination, and build the open self-identify list + closed deep-link plus
  admin revert / delete-guest controls.

## Supersedes

The email-anchored claim model — currently described in
[`../data-model.md`](../data-model.md) ("Email-anchored claim") and
[`../../engineering/database-reference.md`](../../engineering/database-reference.md) — and the
former `stub-players.md` + `profile-claim.md` concept docs, now consolidated into
[`../../product/guests-and-invites.md`](../../product/guests-and-invites.md). It also supersedes
the intermediate sketches considered earlier in the same effort (admin user search + per-guest
bearer links; and an open-only self-identify link with no addressed variant).
