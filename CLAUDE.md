# CLAUDE.md

Working notes for AI agents and contributors on Abong, a long-term rental marketplace for Pangasinan, Philippines.

## Repo

- npm workspaces; only `apps/web` is implemented. `backend/`, `shared/`, `apps/mobile`, `apps/admin` are documented placeholders. Don't add code there without being asked.
- Run commands from the repo root: `npm run dev | build | typecheck | lint | check | test:e2e`.
- Windows dev environment; the scripts are cross-platform.
- To pick a dev port, run `npx vite --port <n> --strictPort` from `apps/web`. `npm run dev -- --port …` doesn't forward the flags through the workspace script (Vite treats the number as its root). A second Vite instance also re-optimizes the shared dependency cache, which leaves an already-running server failing with 504 "Outdated Optimize Dep" until it restarts.

## Web app conventions (`apps/web/src`)

- **Layering:** `pages → features → components/services`. Pages compose; features hold domain logic; `components/` is domain-agnostic. Never import `data/` or `services/mock/` outside `services/`.
- **Data:** add or modify data access in `services/*.service.ts` (async, returns domain types), consume it via TanStack Query hooks with keys from `lib/query.ts` (`qk`), and invalidate by domain prefix after mutations.
- **Routes:** add to `app/router/routes.tsx`. Page modules export `{ XPage as Component }` for lazy loading and call `useDocumentTitle()`.
- **Labels and statuses:** use `constants/listing.ts` and `constants/status.ts`. Don't hardcode status colours; use `StatusBadge`/`MetaBadge` with a `Tone`.
- **Forms:** wrap controls in `FormField` (label, hint, error; ARIA comes via context) and use `useFormState` for validation. Validate on submit, then on blur.
- **Styling:** Tailwind with semantic tokens from `index.css` (`bg-primary`, `text-muted-foreground`, `bg-mango-soft`…). No raw hex in components except the gulf-map illustration. Fonts: `font-heading` (Bricolage Grotesque) and default sans (Figtree).
- **Type scale:** headings use `type-display | type-page-title | type-section-title | type-subsection | type-card-title`; text uses `text-caption` (12px, the floor) `text-meta` (13) `text-body` (15) `text-lead` (17); prices and metrics use `font-display` with `text-price`/`text-metric`. No one-off `text-[…]` sizes. New size tokens must also be registered in `lib/utils.ts`, or `cn()` drops them as colours.
- **Money and dates:** `formatPeso`, `formatDate`, `formatRelative`, `daysSince` from `lib/format.ts`. Don't call `Date.now()` inside component bodies (lint rule).
- **Copy:** sentence case, plain local terms (CR, bedspace, advance, deposit). No all-caps labels, no "·"-joined metadata strings, no arrows in button text.
- **Accessibility:** icon-only buttons need `aria-label`; decorative icons get `aria-hidden`. Keep the skip link and `main#main` focus behaviour intact.
- **Money facts have one source of truth:** utilities live in `terms.utilitiesIncluded` and `terms.utilitiesNote`, never in the amenity list. Show move-in money with `moveInEstimate()` from `features/listings/listing-utils.ts` and label it as an estimate.
- **Admin pages:** start with `AdminPageHeader` (`features/admin/admin-page-header.tsx`), with at most one `HeaderMetric`. `ReviewSplit`'s height assumes this header, so a taller one makes the page scroll.
- **Mock-data honesty:** listings and people are fictional; coordinates are approximate; walking times are estimates. Keep the UI wording consistent with that.

## Verification checklist

1. `npm run check` (typecheck, lint with zero warnings, build)
2. `npm run test:e2e`
3. Inspect changed screens at 320, 390, 768, 1024 and 1440 widths; there should be no horizontal scroll. Playwright hides scrollbars unless launched with `ignoreDefaultArgs: ["--hide-scrollbars"]`, so test widths and scrollbar styling with that on. Single-column grids need `grid-cols-1` so truncated text can't widen the track.

`docs/product-audit.md` holds the latest audit, with open issues ranked by severity.
