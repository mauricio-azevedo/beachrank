# Guests &amp; Invites — convidados, e os convites open / closed

> **Phase:** Proposed redesign — not yet implemented. This document owns the target
> model (the _why_, the _experience_, the _rules_). The currently shipped behavior is
> the **email-anchored claim**, described in
> [`../architecture/data-model.md`](../architecture/data-model.md) and
> [`../engineering/database-reference.md`](../engineering/database-reference.md), and is
> **superseded** by this document. The engineering plan (schema, services, UI) is
> separate and disposable; this document is meant to outlive it.
>
> Replaces the former `stub-players.md` + `profile-claim.md`. The decision and its
> trade-offs are recorded in
> [ADR 0004](../architecture/adr/0004-unify-guest-invite-and-claim.md).

A **guest** (convidado) is a player who is part of a group but doesn't have an account
yet. Someone typed their name on the court so they could be scored today; later, the real
person can **take over** that guest and keep all of its history — matches, rating, ranking
position. Joining a group and taking over a guest are the **same act**, reached through
**two guest-aware invites**: an **open** link the group shares with everyone, and a
**closed** link addressed to one specific guest.

## Problem

Two problems, one root.

1. **People play on a beach court, not at a keyboard.** Anyone added to a match usually
   doesn't have their phone in hand. A flow that requires them to receive a link, install
   the app, and sign up _before_ they can appear in a match has already failed the moment
   that matters — registering today's game.
2. **A guest-blind invite is a duplicate machine.** The moment a group has guests, a
   generic "join the group" link that anyone clicks creates a **second** membership for
   people who already exist as a guest — and reconciling those duplicates needs the
   painful, partly-blocked **merge**.

The fix to (1) is the guest: add a player with just a name, no account required. The fix to
(2) is that **every invite is guest-aware**: when a person arrives, they identify
themselves against the guests that already exist, so they take over their player instead of
creating a second one.

## The reframe — two guest-aware invites, one heart

There is one entity: the **player** (`GroupMember`). It exists the instant someone types a
name. Having an account is just a state of that player: **unclaimed** (a guest, dashed
avatar) or **claimed** (a real member).

Both invites lead to the **same recognition screen** — the moment that shows a player its
own history and asks "is this you?". They differ only in how the person gets there:

- **Open guest invite — the group's link.** One shareable link / QR (paste it in the
  group's chat). On open, the person sees the list of **unclaimed guests** and self-
  identifies. It also offers **"none of these — just join"** for a genuine newcomer.
- **Closed guest invite — addressed to one guest.** A link generated for a specific guest
  and sent to that person. It **deep-links straight to that guest's recognition screen** —
  no roster, a personal "this is you" gift.

The closed invite is just the open invite **pre-aimed at one guest** (same recognition
screen, skipping the list), so the two come hand in hand at little extra cost.

### Why there is no "generic" join link

A generic link that joins the group **without** identifying the person is the duplicate
machine from problem (2). The open invite's **"none of these — just join"** branch is that
same join _with self-identification in front of it_ — and that step is exactly what stops
the duplicate. So there is no separate generic link; the open invite subsumes it safely.

## Who can do what

- **Create a guest on court:** any active member. Low-risk, high-frequency — the arena path.
- **Share the open link / generate a closed link:** admins.
- **Govern guests (delete a mistaken one, revert a take-over):** admins.

## The experience

### 1. Creating a guest on court (unchanged)

The fastest add is the one that happens where you already are — the **player picker inside
match registration**:

- In a player slot, search for a teammate by name.
- If no one matches, the same field offers **Criar "&lt;name&gt;"**.
- One tap creates the player, drops them into the slot and the group.

A brand-new group with fewer than four members is never blocked from opening the match form
— you build the roster while registering the first match. A guest is **visibly marked as
not-yet-claimed** — a "Convidado" tag and/or the members list grouped by role
(admins · members · guests) — so it's legible who can still be taken over; the dashed avatar
already hints at it, and the exact treatment is settled at design time. A guest's name is
also **not a profile link** — there's no account behind it yet.

### 2. The open invite — "which of these is you?"

The group has **one shareable link / QR**. It is **viewable without logging in**, so the
gift can hook the person before any friction:

- The list shows the unclaimed guests with **name, avatar, and a match count** ("N jogos") —
  enough to self-recognize, but not the match graph (no partners/opponents), so the roster
  isn't an open record of who played with whom.
- **Picking yourself** opens the **recognition screen** (below) — that's where the history
  appears.
- A clear **"não estou aqui — entrar como novo"** option joins as a new member.
- **Login / signup happens only at the commit** — the moment you take over a guest or join
  as new — not to browse.
- **Empty list** (new group, or all players already claimed) → the step is skipped and the
  person joins directly.
- **Already a member** who opens the link can still take over a guest (a **merge**, below)
  — or just continue into the group.

### 3. The closed invite — the addressed gift

From a guest's profile, an admin generates that guest's **closed link** and sends it to the
person. Opening it lands **straight on that guest's recognition screen** — no roster, no
"which one is you?". It's the same screen and the same commit; it just feels like a present
made for them. The closed link is **reusable until the guest is taken over** (re-sendable
without regenerating).

### 4. Taking over a guest ("assumir o perfil")

The recognition screen answers "is this me?" before asking to commit:

- **Recognition first.** The player's name, where it sits (posição · rating · partidas), and
  its **last few matches** (partners and opponents) — so the person confirms it's really
  their history before taking it.
- **Confirm (after login/signup) → two outcomes:**
  - **Assumido (success).** The history is theirs; their real name replaces the guest name
    everywhere automatically. If they weren't a member, they join as that player; if they
    already were, the guest **merges** into their membership.
  - **Conflito (blocked) — the one block.** If the person and the player ever shared a match
    in the group (partners _or_ opponents), they're provably different people; merging would
    put the same person twice in one match. The take-over is refused and nothing changes.
- **Taking over is instant** — no admin approval. The **admin is notified** ("Fulano assumiu
  o convidado Beltrano"), and that notification is **actionable** — revert in one tap.
- **"Não sou eu"** is a courtesy exit on the recognition screen: it just acknowledges ("sem
  problemas") and leaves. It records nothing and notifies no one — consistent with there
  being no pending/declined state; the admin's only signal is that the guest stays
  unclaimed. See _Decline awareness_ under "Not in this concept" for the future improvement.

### Why taking over is cheap

Matches reference the **membership**, not the account. So taking over a guest that isn't yet
a member is just **attaching an account to the same membership** — zero history migration,
no rating recompute. The merge case (already a member) re-points the guest's matches onto the
existing membership and rebuilds ratings/ranks/stats asynchronously, so the combined history
is consistent. Because that rebuild is async, the success screen after a merge surfaces a
brief **"recalculando"** state rather than showing pre-merge numbers as final.

## Rules

- A guest has a **required name** and no linked account; the name lives on the member itself.
  A real member's name always comes from their account.
- A guest **participates fully** in matches, ratings, and the group ranking, exactly like a
  real member. It has no personal home feed, so it never earns personal/weekly highlights.
  Its name is **not a profile link** anywhere.
- A guest has only **two states**: unclaimed (dashed avatar) and claimed. There is **no
  pending/declined/invited state** — nobody anchors a guest to anyone; a person either takes
  it over or doesn't. The unclaimed state is **surfaced** (a "Convidado" tag and/or grouping
  in the members list), so admins and members can see who's still a guest.
- **Self-identification is the consent**, the **shared-match block** is the hard guard, and
  the **admin notification + revert** is the safety net. There is no approval gate on the
  happy path.
- A take-over is **reversible by an admin** (detach the account; the member goes back to a
  guest).
- Both invites are **reusable until the guest is taken over** and **not revocable** in this
  version. If an invite's target was already taken over (or the guest was deleted), opening
  it **falls back gracefully** to the open list / "join as new" — never a dead end.
- The **shared-match block is absolute** — never overridden, by anyone. Fixing a wrong block
  means fixing the mis-logged match, not forcing the take-over.

## Assumptions (premissas)

| #   | Assumption                                                                                                          | Source           |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---------------- |
| P1  | Matches reference `GroupMember`, never `User` — the invariant that makes take-over cheap. Not revisited.            | crown-jewel      |
| P2  | `stub` is renamed `guest` (convidado) across product **and** code.                                                  | product decision |
| P3  | Two guest-aware invites — **open** (the group's mass link) + **closed** (addressed to one guest).                   | product decision |
| P4  | There is **no generic join link**; the open invite's "just join" branch subsumes it safely.                         | product decision |
| P5  | Open list shows name + avatar + match count; full history shows on the recognition screen. Browsing needs no login. | product decision |
| P6  | Login/signup happens only at the commit (take over or join), not to browse.                                         | product decision |
| P7  | Both invites are reusable until taken over and not revocable (V1); an unavailable target falls back.                | product decision |
| P8  | Take-over is instant + reversible by an admin; the admin notification is actionable (one-tap revert).               | product decision |
| P9  | The shared-match merge block is physics of the data (`@@unique([matchId, groupMemberId])`) and survives.            | invariant        |

## Cases &amp; edges

| Case                                                      | Behavior                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Name typed on court, never claimed                        | Stays a guest forever; scores normally; dashed avatar.                                                                                     |
| Open: finds self in the list                              | Recognition → takes over (login at commit); admin notified; reversible.                                                                    |
| Open: "none of these is me"                               | Joins directly as a new member (login at commit).                                                                                          |
| Unclaimed list is empty                                   | Step is skipped; joins directly.                                                                                                           |
| Closed: opens the addressed link                          | Lands straight on that guest's recognition screen.                                                                                         |
| Invite target already taken over / guest deleted          | Graceful fallback: "this profile was already claimed" → the open list / "join as new".                                                     |
| Already a member opens an open/closed link                | Can take over a guest (merge), or continue into the group.                                                                                 |
| Person taking over is **already a member**                | Guest merges into their existing membership; ratings/ranks rebuilt async ("recalculando").                                                 |
| Person and player **shared a match**                      | Take-over refused (the one block); nothing changes; reuses the conflict screen.                                                            |
| Impostor takes over a high-ranked guest (no shared match) | Accepted; admin notification is actionable (one-tap revert); if the real owner already joined as a duplicate, recovered by revert + merge. |
| Admin created a guest by mistake                          | Admin deletes the guest.                                                                                                                   |

## What changes from today

- **Removed:** `claimEmail` / `claimEmailStatus` / `claimEmailNotifiedAt`, the whole
  email-anchored claim flow and its registration hook, the admin claim-email panel, the
  `CLAIM_OFFER` / `CLAIM_OFFER_DECLINED` notifications, **and the generic guest-blind join
  link** (subsumed by the open invite's "just join" branch).
- **Added:** the **open invite** ("which of these is you?" + "just join") and the **closed
  invite** (a guest's addressed link); an actionable admin notification when a guest is taken
  over; admin **revert** and **delete-guest** controls.
- **Unified:** both invites share one recognition/claim/conflict/success core; closed is the
  open invite pre-aimed at one guest.
- **Renamed:** stub → guest everywhere (UI copy, code, docs).
- **Reversed, on purpose:** the previous concept routed claims through an admin's email
  vouch. This model routes them through the person's own self-identification, with the
  shared-match block plus admin notify/revert as the safety net. It also makes a take-over
  reversible, where the prior concept treated it as irreversible.

## Accepted limitations

- **The invites are unrevocable for now.** If a link leaks, anyone with it can browse and
  take over; link rotation is future work.
- **The open list is visible to any link-holder** (no login to browse), and a take-over is
  self-served. Showing only name + avatar (history behind the recognition screen) limits the
  exposure, but the names are still visible. Impersonation is bounded by the shared-match
  block, the actionable admin notification (one-tap revert), and admin revert — accepted for
  small, trusted groups. Worst case: an impostor takes over a high-ranked guest they never
  played against; the real owner then no longer finds themselves in the list and joins as a
  duplicate. It is **recoverable** — an admin reverts the take-over (restoring the guest) and
  merges the duplicate — not prevented. Identity verification is deliberately out of scope.
- **The recognition screen reveals a guest's recent matches and partners** to whoever opens
  it (open pick or closed link) — more than just names. Accepted for casual groups as part of
  the self-identify trade-off.

## Not in this concept

- **Identity verification** and **link rotation/revocation** — future work.
- **Reconciling two real memberships that already shared a match** — the blocked merge above.
  Would require splitting/curating match history; deliberately out of scope.
- **Heavier admin governance:** bulk operations, an audit log of take-overs.
- **Decline awareness** — telling the admin that the person a closed invite was sent to said
  "não sou eu" (today it's a silent, stateless exit), and the invalidation semantics that
  would imply (re-target, kill the link, or neither). Deferred — revisit if mis-sends prove
  common.
- **Email / push delivery** of notifications — in-app only.
