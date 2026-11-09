# Replacing the mock layer with a real API

The UI never touches mock data directly. Everything goes through `apps/web/src/services/*.service.ts`, re-exported from `services/index.ts`. To integrate a backend:

1. **Add an HTTP client** (`services/http.ts`) with base URL from `VITE_API_URL`, auth header injection and error mapping to `ServiceError` (`not-found | forbidden | invalid | unknown`). The UI already branches on `error.code === "not-found"`.
2. **Re-implement each service** with the same function signatures, one domain at a time. Keep projections like `toListing` on the server and return the `Listing` shape directly.
3. **Delete** `services/mock/` and `src/data/` when the last service is migrated.
4. **Auth:** replace `auth.service.ts` and `features/auth/auth-provider.tsx` with token/session handling. `RequireRole` and `useAuth()` stay the same.
5. **Uploads:** `components/forms/image-upload.tsx` previews files locally. Wire it to signed upload URLs. Verification documents (`features/verification/mock-document-picker.tsx`) currently record file names only; real documents need encrypted storage and access controls before collection starts.
6. **Real-time:** the inbox polls nothing today. Add websocket/SSE invalidation of `["inquiries"]` and `["viewings"]` query keys. The demo-only simulated landlord reply in `features/inquiries/inbox.tsx` is gated by `DEMO_MODE` and can be removed.

## Rules the backend must enforce

- **Unreviewed listings:** only the owner and admins may read a `pending-review` listing. The mock lets anyone with the link open it because the browser can't enforce this.
- **Ownership:** check the caller on every inquiry and viewing call. Today's mock services trust the IDs they're given.
- **Admin calls:** every `adminService` method and `verificationService.listQueue`/`review` must check that the caller is an active admin, using the server session. The mock services already refuse other callers (`requireAdmin()` in `services/mock/session.ts`), but that check runs in the browser and reads `localStorage`, so it is not security.
- **Decision rules:** the server must enforce what the mock enforces: allowed moderation actions per listing status (`MODERATION_ACTIONS`), report transitions (`REPORT_TRANSITIONS`), only pending verifications can be decided, and a note of at least `DECISION_NOTE_MIN` characters to reject, suspend, request changes, close a report or suspend an account.
- **Audit log:** record every admin decision in an append-only table in the same transaction as the change: actor from the session, time, area, target, status before and after, and note. Admins read it; nobody edits or deletes it. Today it lives in the demo store (`auditLog`), so it is per-browser and can be cleared.
- **Suspension:** end existing sessions when an account is suspended, and hide that landlord's listings.
- **Re-review:** send a live listing back to review on address and rent changes, as `properties.service.ts` does.
- **Profile photos** (`profile-photos.service.ts`):
  - Only the signed-in user can set, change or remove their own photo. The mock takes no user id for these calls for the same reason.
  - Re-check the upload on the server. Accept only JPEG, PNG or WebP by their magic bytes (not the file name or `Content-Type`), cap the file size (10 MB) and dimensions (8000 px), then decode and re-encode it (for example with `sharp`) to a 320 px square WebP. This drops EXIF, GPS and other metadata and neutralises payloads hidden in the file. The browser already does the same, but nothing it sends can be trusted.
  - Store photos in private object storage and serve them through short-lived signed URLs. Never put them at public, guessable paths, because renter photos are not public.
  - Decide visibility on the server for each request. Owners and active admins always see a photo. A landlord's `public` photo is visible to anyone. A `contacts` photo is visible only to the other side of a two-way contact: the landlord has replied in the renter's inquiry, or has confirmed or completed one of their viewings (`services/contact.ts`). A `private` photo is visible to nobody else. Renter photos can never be `public`. Hide photos of suspended or deactivated accounts.
  - A photo is never evidence of identity, and nothing derives verification status from it.
  - Today photos are data URLs in the demo store, so they stay in one browser and don't follow the account to another device.
- **Rentals** (`rentals.service.ts`): a stay both sides confirmed. It isn't a lease, so it holds no contract, ID or payment details.
  - Only the renter, the landlord and active admins can read a rental. Never expose rentals or rental history publicly.
  - Either side can propose a stay, but only to someone they are already in two-way contact with (`services/contact.ts`). A landlord can't attach a stranger, and a renter can't claim a property whose landlord never answered them.
  - Only the other side can confirm a proposal. Refuse self-confirmation by comparing the caller's side with `proposedBy`.
  - Allow one open (pending, confirmed or disputed) rental per renter, property and unit. Move-in dates can be up to two years back or six months ahead. Move-out dates fall between move-in and today. Use the Asia/Manila calendar date.
  - Disputes: either side can dispute a confirmed or ended stay with a reason. Reviews of that stay are held, not shown, until an admin keeps the stay (back to its previous status, reviews published again) or voids it (reviews stay hidden). Record the decision in the audit log with a note.
  - Recording a stay doesn't change unit occupancy. Landlords still set that themselves.
- **Reviews** (`reviews.service.ts`, `review-eligibility.ts`):
  - Decide eligibility on the server from stored rentals and viewings, never from the request.
  - A residence review needs a confirmed stay at least 30 days old, or an ended stay. A viewing review needs a viewing the landlord marked completed, no more than 90 days ago. Allow one review per stay or viewing, enforced with a unique index on `(kind, source_id)`.
  - Only the author can edit or delete a review, and `author_id`, `landlord_id` and `listing_id` never change after creation. Store the property name with the review, so it still reads correctly after the listing is renamed, archived or changes hands.
  - Landlords can't review their own property, and can add, edit or remove only their own single reply. They can't edit, hide or delete a review.
  - Anyone signed in except the author can report a review once. Only an admin can hide or restore one, with a note recorded in the audit log. Restoring is refused while its stay is disputed or after it was voided.
  - Reject review and reply text that contains phone numbers or email addresses. Show authors publicly as first name and last initial only.
- **Reputation** (`reputation.ts`):
  - Compute it on the server from stored records. Nothing is entered by hand. The old `responseRate` and `responseTimeHours` fields were typed-in seed numbers and have been removed.
  - Response rate is the share of inquiries from the last 90 days that got a first reply written by a person within 24 hours. Typical response time is the median hours to that first reply. Leave out unanswered inquiries younger than 24 hours, and messages flagged `automated`. Show no figure below 3 inquiries.
  - Ratings count only published reviews, with residence and viewing reviews kept separate. Show an average only from 3 reviews. With no reviews, show "no reviews yet", never a zero score.
  - Keep verification separate: nothing derives a verified status from ratings.

## Endpoint sketch

| Service method | Suggested endpoint |
|---|---|
| `listingsService.search(filters)` | `GET /listings?location=&near=&types=&priceMin=…` |
| `listingsService.getListing(id)` | `GET /listings/:id` |
| `listingsService.getNearbyPlaces(id)` | `GET /listings/:id/nearby` (geospatial) |
| `favoritesService.*` | `GET/POST/DELETE /me/favorites`, `/me/saved-searches` |
| `inquiriesService.*` | `GET /me/inquiries`, `POST /inquiries`, `POST /inquiries/:id/messages` |
| `viewingsService.*` | `GET /me/viewings`, `POST /viewings`, `PATCH /viewings/:id` |
| `propertiesService.*` | `/landlord/properties`, `/landlord/properties/:id/units` |
| `verificationService.*` | `/landlord/verification`, `/admin/verifications/:id/review` |
| `adminService.*` | `/admin/overview`, `/admin/users`, `/admin/users/:id/status`, `/admin/listings/:id/moderate`, `/admin/reports/:id` |
| `adminService.listAudit`, `getHistory` | `GET /admin/audit?area=&page=`, `GET /admin/audit?target=` |
| `reportsService.create` | `POST /listings/:id/reports` |
| `profilePhotosService.get(userId)` | `GET /users/:id/photo` (returns a signed URL, or 404 when the caller may not see it) |
| `profilePhotosService.getMine/setMine/removeMine/setVisibility` | `GET/PUT/DELETE /me/photo`, `PATCH /me/photo` |
| `rentalsService.listMine/proposalOptions/propose` | `GET /me/rentals`, `GET /me/rentals/options`, `POST /rentals` |
| `rentalsService.answer/cancel/end/dispute` | `POST /rentals/:id/confirm` (or `/decline`), `/cancel`, `/end`, `/disputes` |
| `rentalsService.listDisputes/resolveDispute` | `GET /admin/rental-disputes`, `POST /admin/rentals/:id/resolve` |
| `reviewsService.listForLandlord/listForListing` | `GET /landlords/:id/reviews`, `GET /listings/:id/reviews` (both with summary) |
| `reviewsService.myOpportunities/listMine/create/update/remove` | `GET /me/review-opportunities`, `GET /me/reviews`, `POST /reviews`, `PATCH/DELETE /reviews/:id` |
| `reviewsService.respond/removeResponse/report` | `PUT/DELETE /reviews/:id/response`, `POST /reviews/:id/reports` |
| `reviewsService.listReported/listHidden/decide/restore` | `GET /admin/reviews?status=reported` or `hidden`, `POST /admin/reviews/:id/decision` |

Geospatial search (`near`, distance sort, bounding-box map queries) belongs on the server (e.g. PostGIS). The client currently filters within 5 km of the anchor.

## Data model notes for rentals and reviews

When moving this to a database, these are new tables. They don't change existing ones, so the migration is purely additive and reversible by dropping them:

- `profile_photos(user_id PK FK users, storage_key, visibility, updated_at)`
- `rentals(id, renter_id FK users, landlord_id FK landlord_profiles, listing_id FK properties, unit_id NULL, start_date, end_date NULL, proposed_by, status, property_name, unit_name, confirmed_at, created_at, updated_at)` with a partial unique index on `(renter_id, listing_id, unit_id)` (nulls treated as equal) where status is pending, confirmed or disputed.
- `rental_disputes(id, rental_id FK, opened_by, reason, previous_status, opened_at, resolved_at, resolved_by, outcome, note)`. Keep resolved disputes as history instead of clearing them as the mock does.
- `reviews(id, kind, source_id, author_id, landlord_id, listing_id, overall, aspects jsonb, recommend NULL, body NULL, status, property_name, created_at, edited_at)` with a unique index on `(kind, source_id)`. Use `ON DELETE RESTRICT` (or soft delete) on landlord and listing, so reviews keep their history.
- `review_responses(review_id PK FK, body, created_at, updated_at)`
- `review_reports(id, review_id FK, reporter_id, reason, details, status, created_at, resolution_note)`
- `messages.automated boolean default false`. This one adds a column to an existing table: a default-false add is safe online.

The existing `landlord_profiles.response_rate` and `response_time_hours` columns, if they exist, can be dropped once nothing reads them. Do that in a separate, later migration, after the computed figures ship.

**Privacy (Data Privacy Act of 2012, RA 10173).** Rentals, reviews and photos are personal data. Collect only what's listed above. State the purpose in the privacy notice, which is records of stays and reviews for trust between renters and landlords. Let users correct their own data (edit review, report a stay) and delete it (remove review, remove photo). Set a retention period for ended and voided rentals and for resolved disputes. Restrict admin access to the decision views.
