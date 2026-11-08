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

Geospatial search (`near`, distance sort, bounding-box map queries) belongs on the server (e.g. PostGIS). The client currently filters within 5 km of the anchor.
