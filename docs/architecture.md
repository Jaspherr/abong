# Web architecture

`apps/web` is a Vite + React 19 + TypeScript (strict) single-page app styled with Tailwind CSS v4 and shadcn/ui (Radix).

## Folder structure

```text
src/
  app/
    layouts/      Root, public, account (renter and landlord), admin, auth layouts
    providers/    Query client, auth, tooltips, toasts
    router/       Route table (lazy, one chunk per page) and the route error boundary
  components/
    ui/           shadcn primitives, adapted to the design tokens
    common/       Brand-level building blocks: Logo, Photo, StatusBadge, PageHeader…
    layout/       Site header/footer, user menu
    maps/         Provider-agnostic MapView + provider adapters
    forms/        FormField (+ context), ImageUpload
    feedback/     Empty/error states, skeletons
    charts/       Small SVG charts for admin
  features/       Domain logic and composite UI, grouped by domain:
                  auth, discovery, listings, favorites, inquiries, viewings,
                  landlord, verification, admin
  pages/          Route components only — compose features, no business logic
  services/       Data access boundary (currently backed by mock/)
  data/           Seed data for the mock services. Imported only by services/mock
  types/          Domain model
  constants/      Labels, status → tone maps, routes, brand
  hooks/          Generic hooks (document title, media query, debounce, form state)
  lib/            Pure helpers: formatting (₱, dates, distance), geo, query keys
```

**Rule of thumb:** `pages → features → components/services`. Pages never import `data/`. Features never import `services/mock/`.

## Routing

`src/app/router/routes.tsx` uses React Router's data router. Every page module exports `Component` and is lazy-loaded.

| Area | Paths | Guard |
|---|---|---|
| Public | `/`, `/search`, `/listing/:id`, `/landlord/:id`, `/near/:slug`, `/for-landlords`, `/safety` | none |
| Renter | `/favorites` (guests allowed, device-local), `/inquiries`, `/viewings`, `/profile` | `RequireRole role="renter"` |
| Auth | `/login`, `/register`, `/forgot-password` | none |
| Landlord | `/landlord/dashboard`, `/landlord/properties[/new|/:id]`, `/landlord/listings`, `/landlord/inquiries`, `/landlord/viewings`, `/landlord/verification`, `/landlord/profile` | `RequireRole role="landlord"` |
| Admin | `/admin`, `/admin/users`, `/admin/landlords`, `/admin/listings`, `/admin/verifications`, `/admin/reports`, `/admin/analytics`, `/admin/profile` | `RequireRole role="admin"` |

Guests hitting a guarded route are redirected to `/login?next=…`. Signed-in users with the wrong role see an explanation, plus a demo role switch when `DEMO_MODE` is on.

## Data flow

```text
page → feature hook (TanStack Query) → services/*.service.ts → services/mock/db (+ data/)
```

- **Services** are async and return plain domain objects (cloned, so callers can't mutate the store). They simulate latency so loading states are exercised.
- **Query keys** are centralised in `lib/query.ts` (`qk`). Mutations invalidate by domain prefix (`["listings"]`, `["properties"]`, `["admin"]`…).
- **Search state** lives in the URL (`features/discovery/search-params.ts`), so results are shareable and survive refresh.
- **Auth** is a mock provider (`features/auth`). The session is a user id in `localStorage`.

See [backend-integration.md](backend-integration.md) for swapping the mock layer.

## Maps

`components/maps/map-view.tsx` talks only to the `MapAdapter` interface in `components/maps/types.ts`. The current adapter (`providers/leaflet-osm.ts`) uses Leaflet with OpenStreetMap tiles and is code-split, so Leaflet loads only when a map is on screen. To add Mapbox or Google Maps, implement `MapAdapter` in a new provider file, register it in `PROVIDERS`, and set `VITE_MAP_PROVIDER`.

> The public OSM tile server is fine for development but not for production traffic. Use a hosted tile provider before launch.

The homepage "Gulf map" (`features/discovery/gulf-map.tsx`) is a hand-drawn SVG illustration, not a map provider.

## Distances

Distances are great-circle (haversine) from approximate coordinates. Walking estimates assume 4.8 km/h with a 1.3× street detour factor, appear only within 1.5 km, and are labelled as estimates in the UI. Replace them with routed travel times when a routing API is available.

## Performance

- Route-level code splitting; vendor chunks (`react`, `router-query`, `radix`, `date`) split for long-term caching.
- Listing photos are local WebP (~960×720, 60–150 KB) with lazy loading and an eager/high-priority first image.
- Leaflet and its CSS load on demand.
- Search uses `keepPreviousData`, so filter changes don't flash skeletons.

## Accessibility

Semantic landmarks with a skip link. Focus moves to `<main>` on navigation. Radix handles focus traps in dialogs and sheets. `FormField` wires labels, descriptions and `aria-invalid` (via context, so wrapped inputs and Select triggers are labelled correctly). Every chip filter is a real checkbox or radio. Map markers are keyboard-focusable buttons. Reduced motion is respected globally. Lighthouse accessibility scores 100 on the homepage.

## Testing

`apps/web/e2e/smoke.spec.ts` covers search, filters, guards, the renter inquiry flow, landlord unit availability, viewing actions, property forms and profile, admin moderation and the 404 page, at desktop (1440×900) and mobile (390×844).
