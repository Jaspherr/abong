# Abong

Abong is a long-term rental marketplace for Pangasinan, Philippines. *Abong* is the Pangasinan word for "house".

It helps students, young workers and families find a place to live near their school or work, from bedspaces and boarding house rooms to apartments and family homes. Stays are monthly, per semester or yearly, not short-term travel.

Renters can see the full cost before moving in, including rent, advance, deposit and an estimated move-in total. They can ask landlords questions and request a viewing without paying anything upfront. Abong never handles money: payments happen directly between renter and landlord, after the renter has seen the place.

Landlords can list their properties and units, answer inquiries, schedule viewings and get verified. Admins moderate listings, review verifications and handle reports.

> **Demo build.** All listings, landlords and people are fictional. Place, school and landmark names are real, but their coordinates are approximate and walking times are estimates. Sign-in is mocked, demo data stays in your browser, and no payments, documents or identities are collected.

## What's in the repo

```text
apps/
  web/       The web app: public marketplace, renter, landlord and admin areas
  mobile/    Placeholder for a future mobile app
  admin/     Placeholder in case the admin console becomes its own app
backend/     Placeholder for the future API
shared/      Placeholder for code shared across apps
docs/        Architecture, design system, domain model, backend integration and product audit
CLAUDE.md    Working notes for AI agents and contributors
```

Only `apps/web` is built so far, using React, TypeScript, Vite and Tailwind CSS. It runs on mock data rather than a real server. Each placeholder folder has a short README explaining what it's for.

## Quick start

Requires Node 20.19+.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server for the web app |
| `npm run build` | Type-check and production build (`apps/web/dist`) |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm run check` | typecheck + lint + build |
| `npm run test:e2e` | Playwright smoke tests (desktop + mobile), using your installed Chrome |

### Demo accounts

Sign-in is mocked. On `/login`, use **Continue as renter / landlord / admin**. Once signed in, the account menu has **Switch demo role** and **Reset demo data**.

| Role | Account | Good starting points |
|---|---|---|
| Renter | Mika Reyes, nursing student | `/favorites`, `/inquiries`, `/viewings` |
| Landlord | Teresita Santos, Santos Residences | `/landlord/dashboard`, `/landlord/properties/santos-boarding-house` |
| Admin | Carla Fernandez, operations | `/admin`, `/admin/listings` |

Demo changes (messages, viewing requests, approvals, new properties) are saved in `localStorage` so they survive a reload. **Reset demo data** restores the seed.

Set `VITE_DEMO_MODE=false` to hide the demo helpers (see `apps/web/.env.example`).

## Feature map

**Public:** homepage with place-aware search and a Pangasinan town map · `/search` with list + map, URL-backed filters, sorting, saved searches · listing detail with gallery, terms, per-unit availability, house rules, nearby schools and landmarks, inquiry and viewing flows, reporting · school pages (`/near/:slug`) · landlord profiles · landlord landing and safety guide · 404.

**Renter:** saved places and saved searches · inquiry inbox with conversation history · viewing requests (request, track, cancel) · profile.

**Landlord:** dashboard · properties → units management with inline availability · listing performance · inbox · viewing requests (confirm, decline, reschedule, complete) · three-step verification (contact, identity, property) with mock uploads · public profile editing.

**Admin:** overview and review queues · users (search, filter, paginate, suspend) · landlords · listing moderation (approve, request changes, reject, suspend) · verification review · reports and safety · analytics.

## Documentation

- [Architecture](docs/architecture.md): folder structure, routing, data flow, conventions
- [Design system](docs/design-system.md): brand, tokens, typography, components, motion
- [Domain model](docs/domain-model.md): entities and their relationships
- [Backend integration](docs/backend-integration.md): replacing the mock services with a real API
- [CLAUDE.md](CLAUDE.md): working notes for AI agents and contributors
