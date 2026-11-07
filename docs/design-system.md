# Design system

## Direction

A housing platform for students, workers and families has to earn trust before it delights. The interface is calm, legible and specific to Pangasinan. Boldness is spent in one place, the homepage map of the Lingayen Gulf coast, where each town is an entry point into search. Everything else stays quiet.

Avoided on purpose: Airbnb-style imagery-first layouts, gradient washes, all-caps eyebrow labels, and generic roof-shaped logos.

## Brand

| Token | Value | Use |
|---|---|---|
| `--brand-gulf` | `#0b6466` | Primary actions, links, focus ring. Lingayen Gulf teal |
| `--brand-gulf-deep` | `#084a4c` | Primary hover |
| `--brand-ink` | `#142b33` | Text, dark surfaces (footer, trust section) |
| `--brand-salt` | `#f4f6f5` | Page background. Cool salt-flat neutral |
| `--brand-mango` | `#f3b23a` | Sparing highlights: counts needing attention, the logo's sun |
| `--brand-mist` | `#dce3e1` | Hairlines |

**Logo:** an arched doorway inside a rounded tile, with a small mango "sun". It's an open door rather than a roof (`components/common/logo.tsx`, `public/favicon.svg`).

To rebrand, change the `--brand-*` values in `src/index.css`, the logo component, and `BRAND` in `src/constants/app.ts`.

## Semantic colours

Components use semantic tokens only: `primary`, `secondary`, `muted`, `accent`, `mango`, `success`, `warning`, `destructive`, `info`, each with a `-soft` background variant where needed.

Status meaning is fixed app-wide through `constants/status.ts` → `Tone` → `StatusBadge`:

| Tone | Meaning |
|---|---|
| success | Live, verified, confirmed, available |
| warning | Waiting on someone (pending review, pending viewing) |
| danger | Rejected, suspended, needs intervention |
| info | Needs an update from the landlord |
| neutral | Draft, archived, completed, occupied |
| brand | Informational labels (property type) |

## Typography

- **Bricolage Grotesque** (variable) for headings and numbers in stat tiles: characterful, slightly condensed, signage-like.
- **Figtree** (variable) for UI and body text.
- Headings use `text-balance` and tight tracking; paragraphs use `text-pretty`. Numbers in tables and prices use tabular figures (`.tabular`).
- Both fonts are self-hosted via Fontsource, with no third-party font requests.

## Shape, depth, spacing

- Base radius `0.75rem`. Cards and sheets `rounded-2xl`, hero panels `rounded-3xl`, controls `rounded-lg`, chips `rounded-full`.
- Two shadows only: `shadow-card` (resting surfaces) and `shadow-raised` (hover, floating panels, the search form).
- Controls are 40px tall (`h-10`) for comfortable touch; large CTAs are 48px.
- Page container: `container-page` (max 84rem, 16/24/32px gutters).
- Homepage sections: `min-h-section` fills the screen below the header, capped at 64rem so large monitors don't get empty space. It's a minimum, so longer sections keep growing. Short sections give the extra height to their content (`min-h-section-body`, or a photo with `flex-1`) rather than to blank space.

## Components

shadcn/ui primitives in `components/ui` are kept close to upstream but resized and re-toned. `Input`, `Textarea` and `SelectTrigger` read `FormFieldContext` for labelling. Product-level pieces live in `components/common`:

- `ListingCard` / `ListingMiniCard`: photo, type and town, name, distance to nearest school (with a walk estimate when close), up to three highlights, price with unit (`/ month` or `/ person`), availability
- `StatusBadge` / `MetaBadge`, `VerifiedBadge`, `AvailabilityConfirmed`
- `EmptyState` (with page-level `h1` option), `ErrorState`, skeleton set
- `PageHeader`, `SectionHeading`, `Pagination`, `UserAvatar` (initials only; demo data never uses faces)

## Motion

One entrance per page (`animate-rise`, 320ms, soft ease-out). Everything else responds to input, and hover stays quiet: colours fade in 150ms on one shared curve (`--default-transition-*` in `index.css`), cards change border and shadow without moving, card photos zoom to 1.03 over 400ms (`<Photo hoverZoom />`), arrows nudge 2px, and buttons press to 0.98. Movement is gated with `motion-safe:`, and `prefers-reduced-motion` also shortens every transition and animation globally.

## Copy

Plain, local and specific: "boarding house", "bedspace", "CR", "advance", "deposit", "curfew". Buttons say what happens ("Send request", "Mark resolved"). Errors say what to do next. Money is always `₱` with thousands separators (`Intl.NumberFormat("en-PH")`).
