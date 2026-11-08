# Product audit

The latest audit comes first. Earlier audits follow for history.

# Admin audit (8 November 2026)

A review of the admin side: every admin page, `admin.service`, `verification.service`, the auth and session code, the route guard, and the domain types. Changes were made where the existing architecture supports them; everything else is listed below. There is still no backend, so none of this is real security.

## What already worked

Role-guarded admin routes; a review desk on the overview with three queues and counts in the nav; listing moderation with per-status actions, a required note to the landlord and a confirmation to archive; verification review with a checklist; report triage with scam reports first and a one-step suspend for live scam listings; a user directory with search, filters, pagination and a confirmed suspend that hides a landlord's listings and ends their session; a landlord directory; analytics marked as demo figures.

## Found and fixed

| # | Pri | Issue | Fix |
|---|---|---|---|
| 1 | P0 | Admin services didn't check who was calling; only the route guard did. | Every admin call requires an active admin, read from the session inside the service (`requireAdmin`). Browser-only: see `backend-integration.md`. |
| 2 | P0 | Decision rules lived only in the buttons: the service would approve a draft, close a closed report, or reject without a note. | Services enforce allowed actions, report transitions, pending-only verification decisions, and required notes. |
| 3 | P1 | No record of who decided what. Suspensions, report outcomes and verification decisions left no trace; rejections and suspensions were logged as "listing submitted". | Append-only audit log written by the services: actor, time, target, before and after, note. New Audit log page with area filter and pagination; decision history in the listing, verification and report panels. Activity feed uses the right kind. |
| 4 | P1 | Accounts could be suspended with no reason. | A reason is required, kept on the account, shown in the directory and in the audit log, and cleared on reactivation. |
| 5 | P1 | Reports could be resolved or dismissed with no finding. | A note is required to close a report. |
| 6 | P1 | The overview added fixed numbers (2,400 users, 380 listings) and showed invented growth percentages and sparklines, with no demo label. | Real counts, with how many are from the last 30 days. Unused `Sparkline` and `formatSignedPercent` removed. |
| 7 | P2 | "Suspend listing" from a report under investigation would fail its second step under the new rules. | Only an open report moves to investigating. |
| 8 | P2 | Duplicate and repeat reports were only visible from the listing. | The report panel lists other reports on the same listing. |
| 9 | P2 | A resubmitted verification gave no view of earlier attempts. | The panel lists the landlord's earlier submissions of the same check and their notes. |
| 10 | P2 | Every failure said "That didn't save", even when the service had refused for a reason. | Service refusals are shown as written. |

## Recommended later (P2 and P3)

- Report priority beyond scam reports (suspicious landlord), and an "assigned to" field once there is more than one admin.
- Bulk-closing duplicate reports with one finding.
- Filtering the verification queue by landlord from the landlord directory (the link opens the whole queue).
- CSV export of users and the audit log, once there is a server to generate it with access logging.
- Admin notifications by email for scam reports; today the nav counts are the only alert.
- Marketplace settings (review targets, note minimums). Not worth building until they need to change without a release.

## Needs a backend

Real authentication and server-side role checks; a tamper-proof audit table; ending sessions on suspension server-side; verification document storage with access controls; and server-generated metrics. Details in `backend-integration.md`.

## Validation

`npm run check` passes (typecheck, lint with zero warnings, build). `npm run test:e2e`: 145 passed, 13 skipped, 6 failed; the 6 failures (homepage search, filters and a school count, on both layouts) fail the same way on the commit before this work. New tests cover the audit log and decision history, the required suspension reason, the required report finding, the service refusing a non-admin session, and real overview counts. All admin pages were swept at 320, 390, 768, 1024 and 1440 px with scrollbars shown: no horizontal overflow and no console errors. Chromium only; no screen reader.

---

# Engineering audit (5 November 2026)

A whole-codebase audit of the web app, with fixes applied. The app runs entirely on mock services: there is no backend, so nothing here confirms real security. See "Remaining" below.

## Method

- Read the services, auth, routing, admin, landlord, viewing, verification and inquiry code in full, and sampled the rest. Static sweeps covered dead code (knip), unsafe types, suppressions, and breaks from `CLAUDE.md`. Not every line of every page was read.
- Scripted a sweep of 41 route and role combinations at 8 widths (320 to 1920): 328 page loads, recording console errors, failed requests, overflow, landmarks, headings and dead links, plus axe-core at 375 and 1440.
- Ran the same sweep on the baseline build and the fixed build.
- Tested in Chromium only. Firefox, Safari and real devices were not tested. No screen reader was used, and automated checks cover only part of WCAG 2.2 AA.

## Results

| Check | Before | After |
|---|---|---|
| `npm run check` | Pass, 2 lint warnings | Pass, 0 warnings |
| `npm run test:e2e` | 81 passed, 4 failed, 5 skipped | 107 passed, 0 failed, 5 skipped |
| Pages with horizontal overflow | 3 | 0 |
| Pages with a duplicate `main` (at 1440) | 5 | 0 |
| Pages with heading skips (at 1440) | 12 | 0 |
| axe color-contrast nodes | 64 | 0 |
| axe invalid-ARIA nodes | 16 | 0 |
| axe label-mismatch nodes | 34 | 0 (the last 3, on `/search`, were fixed after the final sweep and rechecked there) |
| Console errors and dead links | 0 | 0 |
| `npm audit --omit=dev` | Moderate and low findings via `shadcn` | 0 |
| `npm audit` including dev tools | 6 (2 low, 4 moderate) | 6 (same; dev tools only) |

The last full sweep ran just before the final small edits (map pin tap size and the unload save). After those, `/` was rechecked with axe at 375 and 1440 and was clean, and the e2e suite passed; the other pages were not swept again.

The 5 skipped tests are ones that apply to only one of the desktop and mobile layouts.

## Performance

No measurable bottleneck was found, so none of this work was a performance optimisation. Median of 5 runs, production build, local preview, no throttling:

| Page | LCP before | LCP after | DOM nodes before | DOM nodes after |
|---|---|---|---|---|
| `/` | 504 ms | 516 ms | 1667 | 1621 |
| `/search` | 644 ms | 664 ms | 1564 | 1565 |
| `/listing/santos-boarding-house` | 588 ms | 544 ms | 904 | 904 |
| `/admin` | 144 ms | 136 ms | 426 | 405 |
| `/admin/listings` | 140 ms | 936 ms (see note) | 301 | 285 |

These differences are within normal run-to-run noise, except `/admin/listings`. That page isn't slower: the title paints earlier (128 ms, was 160 ms), but it is now smaller than the review photo, so the photo became the LCP element. Total build output fell from 1,425,175 to 1,403,967 bytes of JS and from 220,030 to 214,366 bytes of CSS.

## Issues found and fixed

All confirmed, by reading the code or in the browser.

| # | Sev | Area | Issue and impact | Fix |
|---|---|---|---|---|
| 1 | P1 | `auth.service` | A suspended account stayed signed in across visits; only a fresh sign-in checked status | `restore()` ends the session; `signInAs` also checks |
| 2 | P1 | `admin.service`, users page | Admin accounts were protected only by the UI | Service refuses the change |
| 3 | P1 | `admin.service`, property page | The required "Note to landlord" never reached the landlord, so they couldn't see what to fix | Stored as `moderationNote`, shown on the property page and in review; cleared on approval and resubmission |
| 4 | P1 | `properties.service` | Deleting the last unit left a live listing showing ₱0 | Service refuses, with an explanation |
| 5 | P1 | `locations.service` | School cards counted the whole town while the school page counted places within 5 km, so the numbers disagreed | Both use `NEAR_RADIUS_KM` |
| 6 | P1 | `queries.ts` | Town and school counts were cached forever, so they stayed wrong after approvals until a reload | Removed `staleTime: Infinity`; mutations invalidate `places` |
| 7 | P1 | Layouts, responsive | Overflow at 320 px on the landlord dashboard and two admin pages | Fixed, with a regression test |
| 8 | P1 | Accessibility | Two `main` landmarks on `/search` and `/favorites`; tabs pointed at panels that don't exist; 64 contrast failures, mostly faded text | Fixed at the source |
| 9 | P2 | `safeNext`, register | `/\host` passed the redirect check, and registration had its own weaker copy | One shared `safeNext`, with a test |
| 10 | P2 | Header counts | Verification badge read the sign-in snapshot, so it went stale | Reads live data |
| 11 | P2 | Verification page | `?property=` links could lose a loading race; the chosen property could go stale; dialogs kept old files | Fixed |
| 12 | P2 | Verification copy | Page said the badge needs "3 of 3" checks; the code and safety page need identity and property | Copy corrected |
| 13 | P2 | Error handling | Failures were silent on unit status and delete, property actions, reschedule, saved searches, landlord profile and demo sign-in, which could also leave the button stuck | All report an error |
| 14 | P2 | `listUsers` | A change that emptied the last page showed "No users match" | Service steps back a page |
| 15 | P2 | Unit form | Date minimum used UTC (yesterday before 8 AM in the Philippines); a fully taken bedspace unit could be marked available | Fixed |
| 16 | P2 | Photo upload | The same file twice shared an id, so removing one removed both; files over the limit dropped silently | Duplicates skipped, limit explained |
| 17 | P2 | Listing review | "Open listing" led to "not available" for non-public statuses | Only shown when a public page exists |
| 18 | P2 | Tests | Homepage test expected an old headline; the users test assumed one layout | Updated; intent kept |
| 19 | P3 | Town prices | "From" price could quote a taken room | Open units first, same rule as listings |
| 20 | P3 | Hero search | A reversed budget range hid places that fit | Range is normalised |
| 21 | P3 | Inquiries | Re-asking about another unit kept the old one | Unit updated |
| 22 | P3 | Dead code | `StatCard`, `QueueRow`, `FormSection`, `LandlordVerifiedLine`, `formatCompact`, `describeWalk`, `boundsOf`, `getByLandlord` | Removed after confirming no references |
| 23 | P3 | Lint | 2 `setState` in effect warnings | Adjusted during render instead |
| 24 | P2 | Demo database | Changes saved after a 150 ms delay, so leaving the page straight away lost them | Pending changes save when the page unloads; reset can't write old data back |
| 25 | P3 | Dependencies | `shadcn` was a production dependency but only its CSS is used, at build time | Moved to dev; it went from 4.22.1 to 4.23.0 and some build tools took patch updates |

## UI cleanup

- **Admin:** all eight pages stacked the same breadcrumb, oversized title, large number and numbered sections. They now share `AdminPageHeader` and `type-page-title`. Numbers from the removed stat strips moved into the header metric, so no figures were lost, except the per-view result counts where the queue already shows them.
- **Type and copy:** 122 one-off font sizes became tokens, raising 10 and 11 px text to the 12 px floor. 73 all-caps labels are gone, and so are "·" joined strings.
- **Decoration:** removed filler numbering ("01 / Featured", type and town indexes, padded counts) and five decorative rings. Real step numbers in "How it works" stay.
- **Public pages** kept their distinct look; these changes only touched the details above.

## Remaining

**Decisions made after the audit (with the owner's go-ahead)**

1. **Page titles restored**, so each tab names its page (WCAG 2.4.2).
2. **Suspended and deactivated landlords' listings are hidden** from search, listing pages, counts and their public profile. Reactivating brings them back. Their public profile page itself still opens, with no listings.
3. **Live listings go back to review** when the address or a unit's rent changes, or a unit is added. They are hidden from search until approved. Landlords are warned before saving and told afterwards. Photos, copy and availability stay live.
4. **Unreviewed listings** stay open to anyone with the link for now. Limiting them needs a backend, so it is recorded in `backend-integration.md`.
5. **Home page trimmed:** removed the town strip under the hero (the fuller towns section stays) and capped schools at 6 with a link to `/near`. Height at 1440 went from about 11,450 to 10,340 px. It is still long; a further trim is a content decision.

**Not fixable without a backend (blockers to production)**

- There is no real authentication. Any password signs in to a known email, and `DEMO_MODE` is on unless switched off.
- Authorization exists only in route guards and in the browser. Admin services, inquiries and viewings don't check who is calling. Security is unverified until a backend enforces it.
- All data lives in the browser's storage and can be edited there.
- Uploaded photos are temporary browser URLs, so they break after a reload. Verification documents aren't stored.
- Favorites and saved searches are per-device, not per-person.

**Open cleanup**

- `notificationsService` and its seed data have no UI. Kept in case they are planned.
- Display sizes on public pages and renter pages still use one-off `text-[…]` values (about 30, including 14 `clamp()` headings). Kept as part of those pages' look, but they don't follow the scale in `CLAUDE.md`.
- A min budget above max, typed into the filter panel, isn't normalised as the hero search now is.
- The inbox's simulated demo reply isn't cancelled when leaving the page.
- Five `eslint-disable` comments remain: four for hook dependencies (in `map-view.tsx` and `inbox.tsx`) and one for the unused title argument in `use-document-title.ts`. The current lint config doesn't enforce those rules, so they hide nothing today.
- `npm audit` still lists 6 findings in `shadcn`'s dependencies. They only affect dev tools, and the suggested fix is a breaking downgrade.
- Some text links are under 24 px tall. Most have enough spacing to meet WCAG 2.5.8, but this was not checked one by one.

---

# Product audit (November 2026)

An audit of the web app done before the November improvement pass. It covers what was inspected, what already worked, and the issues found, ranked by severity. Issues marked **fixed** were addressed in that pass; the rest are open.

## Method

- Read the route table, domain types, services, design tokens and the docs in this folder.
- Walked the app in Chrome as a guest, a renter (`u-renter-1`), a landlord (`u-landlord-1`) and an admin (`u-admin-1`).
- Scripted a horizontal-overflow sweep of public and renter routes at 320, 390, 768, 1024 and 1440 px.
- Baseline `npm run check` passed (typecheck, lint with zero warnings, build).

## What already works (keep it)

- **Clear positioning.** The home page leads with "Find a place to live in Pangasinan." and a search form. The gulf map, the near-school index and town list are useful entry points, not decoration.
- **Domain model fits local renting.** A property has units, units are priced per unit or per bed, and the search reflects bedspace realities: gender policy, curfew, CR, minimum stay.
- **Trust is designed in.** Verification is split into identity, contact and property. Availability confirmation dates, a report flow, and safety copy ("pay only after a viewing") appear in the right places.
- **Role separation.** The public marketplace, a renter account area, and landlord and admin dashboards each have their own layout and navigation. Admin leads with attention queues.
- **Engineering hygiene.** Lazy routes, a service boundary in front of mock data, TanStack Query keys, semantic tokens, `StatusBadge` tones, `FormField` accessibility context, reduced-motion handling, and a skip link.

## Issues

### High

| # | Area | Issue | Status |
|---|---|---|---|
| H1 | Listing detail | Advance and deposit appear only as "1 month". Renters have to work out the peso total due on move-in themselves, and utilities sit under house rules instead of with the costs. The question renters ask most, "how much do I need on move-in day?", went unanswered. | fixed |
| H2 | Data integrity | "Utilities included" had two sources of truth: an amenity checkbox and a `terms.utilitiesIncluded` switch in the property form. A landlord could tick one and not the other. The listing would then say "Utilities included" under amenities, while search and payment terms treated utilities as extra. | fixed |
| H3 | Saved places | Listings that were taken down vanished silently. The header still counted them ("3 places") while showing fewer cards, and the renter couldn't remove the dead entry. | fixed |
| H4 | Saved places | Saved places was a bookmark grid with no way to compare rent, move-in cost, rules and distance side by side, the job renters use it for. | fixed |
| H5 | Responsive | At 320 px, the home hero headline ("Pangasinan.") forced the hero column wider than the viewport (17 px of horizontal scroll). The search-results sort row clipped its select (15 px). | fixed |

### Medium

| # | Area | Issue | Status |
|---|---|---|---|
| M1 | Landlord dashboard | Six stat tiles in one row from 1280 px. Longer labels wrapped to two lines, so the numbers sat at different heights. | fixed |
| M2 | Admin overview | The sign-ups chart card stretched to the height of the activity feed, leaving a large empty block. | fixed |
| M3 | Property form | "Who it's for" and "House rules" had no helper text, unlike the other sections. Pets were set through the amenities list but shown to renters as a house rule. | fixed (helper text) |
| M4 | Mobile listing | The mobile action bar showed rent but not the move-in total, which is the number renters need while scrolling. | fixed |
| M5 | Photo | `Photo` didn't reset its loading state when `src` changed in place. | fixed |

### Low / open

| # | Area | Issue |
|---|---|---|
| L1 | Property form | Long single-page form. Sections are well grouped, and editing benefits from seeing everything at once, so it was not turned into a wizard. **Fixed** with a sticky section index that marks what is still missing. |
| L2 | Listing detail | New properties are pinned at the town centre until a map provider supports pin placement. The location copy already says "approximate". |
| L3 | Search | "Recommended" sort is a simple verified-and-fresh ordering, not a personalised model. The label is acceptable; don't present it as more. |
| L4 | Inquiries | Inquiry status is only open or closed, and the viewing lifecycle (pending, confirmed, declined, completed, cancelled) carries the detail. That's adequate until real messaging exists. |

## Backend-dependent (not fixable in the frontend)

Real authentication, persistent favorites across devices, messaging delivery and notifications, document verification, geospatial search, price-change history, and map pin placement. See `backend-integration.md`.
