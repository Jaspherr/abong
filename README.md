# Abong

Long-term rental discovery for **Pangasinan, Philippines**: boarding houses, bedspaces, rooms, dormitories, studios, apartments, condos and family homes, rented monthly, per semester or yearly.

*Abong* is Pangasinan for "house". The brand is a temporary working identity; every brand value lives in one place (see [docs/design-system.md](docs/design-system.md)).

> **Demo build.** All listings, landlords and people are fictional. Place, school and landmark names are real; their coordinates are approximate. Nothing is persisted to a server and no payments, documents or identities are collected.

## What's in the repo

```text
apps/
  web/       React + Vite web app: public marketplace, renter, landlord and admin areas  ← implemented
  mobile/    Reserved for the React Native (Expo) app                                  ← placeholder
  admin/     Reserved in case the admin console is extracted from the web app          ← placeholder
backend/     Reserved for the API                                                       ← placeholder
shared/      Reserved for code shared by web, mobile and backend                        ← placeholder
docs/        Architecture, design system, domain model, backend integration guide
```

Only `apps/web` is part of the npm workspace today. The placeholders contain READMEs describing what will live there.

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
