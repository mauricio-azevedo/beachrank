# Critical Flows QA Checklist

This document defines the manual regression flows that should remain healthy as Arena evolves.

Use this checklist before merging risky changes, after large refactors, and before production releases.

## How to use this checklist

For each changed area:

1. run the relevant focused cases;
2. run adjacent flows that could be affected;
3. record what was tested in the PR description;
4. add new cases when product behavior changes.

## Authentication

Login and signup are the full-screen auth screen at `/login` and `/register` (one
`AuthScreen`, toggled between the two modes in place). Signed-out entry points
navigate there via `buildAuthPath`, carrying a `?redirect=` for where to return. On
success a full-page navigation to that destination lets every signed-out branch
re-render.

### Register

- New user can create an account (optional nickname).
- Duplicate email is rejected clearly.
- Required fields are validated (password ≥ 6 characters).
- After register, a full-page navigation lands the user in an authenticated state.

### Login

- Existing user can log in.
- Invalid credentials show a friendly error.
- Toggling between the login and signup modes stays on the screen (local state, no navigation).
- After auth, the user lands on their intended destination (the screen they were on,
  or the captured intent target) when safe.
- Unsafe redirect/intent targets are ignored.
- The "Navegar sem login" link opens home (`/`) without authenticating.

### Logout

- User can open logout action from profile header menu.
- Logout clears auth state.
- User is redirected to a safe public/auth screen.
- Protected screens are no longer accessible after logout.

## Access protection

- `/profile` requires login.
- `/groups/new` requires login.
- `/groups/:groupId/matches/new` requires group membership.
- `/groups/:groupId/matches/:matchId/edit` requires group membership.
- `/groups/:groupId/invite` requires admin role.
- `/login` and `/register` are the auth screen (also the deep-link target for invite
  emails); an already-signed-in visitor is bounced to their redirect target or home.
- A tokenless visitor to a protected route is sent to `/login?redirect=…`, and lands
  on the originally-intended route after authenticating.
- Protected content does not flash before access checks finish.

## Groups

### Group list

- Signed-out user sees signed-out state.
- Signed-in user sees own groups.
- Loading state uses skeleton behavior where applicable.
- Empty state appears when user has no groups.
- Group card click navigates immediately to group detail skeleton/destination context.

### Group detail

- Group detail page loads header, description, actions, tabs, ranking, matches, and members.
- Opening group from list/profile does not leave user stuck on the previous screen.
- Route-level skeleton appears while group detail data loads.
- Back button is real and usable while group detail content loads.
- Back button behavior is reasonable from group detail.

### Group tabs

- Ranking tab switches instantly.
- Matches tab switches instantly.
- Members tab switches instantly.
- URL reflects non-default tabs.
- Refresh on non-default tab restores the expected tab.
- Switching tabs should not trigger unnecessary server navigation when data is already loaded.

## Invites

- Admin can open invite screen.
- Non-admin cannot access invite screen.
- Signed-out user is redirected appropriately.
- Generated invite can be accepted by another user.
- Invite usage count updates correctly.
- Invite screens show a real back button while content loads.
- Revoked/expired/maxed invite behavior is handled if applicable.

## Matches

### Create match

- Group member can create a match.
- Non-member cannot create a match.
- All four players are required.
- Same player cannot appear twice.
- Draw score is rejected.
- Invalid score is rejected.
- Successful match appears in group matches.
- Successful match affects ranking/rating.
- Normal new match creation is fast enough for good UX.
- New match loading state shows a real back button while form data loads.
- After saving a match, the submit button does not return to an idle state before navigation starts.
- After saving a match, the user is sent to the group's Matches tab.
- The destination loading state appears in the group context when match list data is pending.

### Edit match

- Existing match can be edited by an allowed member.
- Edited score updates match display.
- Edited score updates rating snapshots.
- Edited score recalculates group ratings when needed.
- Match-derived feed events are created/updated/removed as needed.
- Edit match loading state shows a real back button while form data loads.
- After saving an edit, the user is sent to the group's Matches tab.

### Delete match

- Existing match can be deleted by an allowed member.
- Deleted match disappears from group matches.
- Ratings are recalculated correctly.
- Match-derived feed items are removed.

## Rating and ranking

- New group members start at expected initial rating.
- Creating a normal match updates only affected current ratings while preserving snapshots.
- Editing a historical match recalculates later rating history.
- Deleting a match recalculates rating history.
- Retroactive match creation recalculates history.
- Ranking order updates after match results.

## Profile

### Own profile

- Own profile requires login.
- Summary tab loads with contextual skeleton.
- Summary stat cards render without text truncation on small screens.
- Matches tab switches immediately and shows skeleton/content correctly.
- Groups tab switches immediately and shows skeleton/content correctly.
- Stats tab behaves consistently with the rest of profile.

### Public profile

- Clicking another user's name opens their profile.
- Public profile resembles own profile where appropriate.
- Private/self-only controls are not shown for another user.
- Public profile route has a contextual skeleton while profile data is pending.
- Public profile loading state shows a real back button while profile content loads.
- Back navigation returns to the expected previous context.
- Opening a public profile from a group match list returns to `/groups/:groupId?tab=matches`.

## Feed

### Feed base states

- Signed-out user sees signed-out feed state.
- Signed-in user sees visible feed items.
- Empty feed state appears when no items are available.
- Error state appears if feed request fails.
- Feed loading state is not text-only.
- Feed items are ordered by recency, newest first, regardless of event type.
- Creating an Atropelo and then a No detalhe should show No detalhe above Atropelo.
- Creating a No detalhe and then an Atropelo should show Atropelo above No detalhe.

### Group created event

- Creating a group creates a feed item.
- Feed card links to the relevant group.
- Visibility matches expected social/group behavior.

### Member joined event

- Joining a group creates a feed item.
- Feed card displays the member display name.
- Feed card links behave correctly.
- Visibility is group-member appropriate.

### Atropelo event (`MATCH_BLOWOUT`)

- Creating a `6-0` match creates an `Atropelo!` feed item.
- Creating a `6-1` match creates an `Atropelo!` feed item.
- Creating a `6-2` match does not create an `Atropelo!` feed item.
- Creating a `7-1` match does not create an `Atropelo!` feed item.
- Team A winning `6-0` displays `6-0`.
- Team B winning `0-6` displays `6-0`.
- Team A winning `6-1` displays `6-1`.
- Team B winning `1-6` displays `6-1`.
- Editing a non-atropelo match into `6-0` or `6-1` creates the feed item.
- Editing an atropelo match from `6-0` to `6-1` updates the feed item.
- Editing an atropelo match into `6-2` removes the feed item.
- Deleting the match removes the feed item.
- Winner and loser names are correct and clickable where appropriate.
- Feed item is visible to group members.

### No detalhe event (`MATCH_CLOSE`)

- Creating a `7-6` match creates a `No detalhe!` feed item.
- Creating a `6-7` match creates a `No detalhe!` feed item.
- Creating a `7-5` match does not create a `No detalhe!` feed item.
- Creating a `6-4` match does not create a `No detalhe!` feed item.
- Team A winning `7-6` displays `7-6`.
- Team B winning `6-7` displays `7-6`.
- Editing a non-close match into `7-6` or `6-7` creates the feed item.
- Editing a close match from `7-6` to `6-7` updates the feed item.
- Editing a close match into `7-5` removes the feed item.
- Deleting the match removes the feed item.
- Winner and loser names are correct and clickable where appropriate.
- Feed item is visible to group members.

## Navigation and loading UX

- Internal link click shows immediate feedback through destination skeletons or local action states.
- Destination screen appears quickly when route-level loading exists.
- Global top loading bars do not flash during normal navigation.
- Skeleton resembles destination layout.
- Skeleton has accessible `sr-only` loading text.
- Structural navigation controls appear immediately in loading states.
- Back buttons are real and usable while destination content loads.
- Browser back returns to expected context for key flows.

## Search

- Search screen loads.
- Searching users/groups returns expected results.
- Clicking a user result opens public profile.
- Clicking a group result opens group detail.
- Empty search result is clear.

## Mobile UI regression

Test on a narrow mobile viewport.

- Bottom nav does not cover important controls.
- Cards do not overflow horizontally.
- Long names truncate or wrap intentionally.
- Stat labels fit.
- Buttons remain tappable.
- Skeletons do not cause layout shift.
- Feed cards remain readable.

## PR validation template

When a PR affects user-visible behavior, include a validation section like:

```md
## Validation

- [ ] Auth flow checked
- [ ] Main changed flow checked
- [ ] Adjacent navigation checked
- [ ] Loading/skeleton state checked
- [ ] Mobile viewport checked
- [ ] Feed/rating side effects checked, if applicable
```

Only check items that were actually validated.
