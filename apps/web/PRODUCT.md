# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: students and young workers** moving to or within Pangasinan, looking for a bedspace, boarding house room or small room near a campus (PSU, PHINMA UPang, LNU, UEP and others) or a work hub (Dagupan, Urdaneta, Lingayen). They decide on budget, the peso total due on move-in day, walking time to school, curfew, CR (private or shared) and who the place is for. Many browse on phones, often with parents involved in the decision.
- **Also served:** working professionals and families renting studios, apartments, condos and houses for monthly or yearly stays.
- **Landlords:** small local owners and managers (boarding houses, dorms, apartment buildings) who list properties and units, answer inquiries, schedule viewings and get verified.
- **Admins:** the platform operations team, who moderate listings, review verifications and handle reports.

## Product Purpose

Abong is a long-term rental marketplace for Pangasinan, Philippines. It helps renters find a place to live, understand the full cost before moving in, ask landlords questions and request a viewing without paying anything upfront. Success means renters move in knowing what they'll pay and who they're renting from, and landlords fill rooms with fewer wasted visits.

## Positioning

Local and long-term only: monthly, per-semester and yearly stays in one province, not short-term travel. The domain fits local renting: per-bed and per-unit pricing, bedspaces, gender policy, curfew, CR, advance and deposit, minimum stay, distance to named schools. Trust is checked rather than claimed: verification is split into identity, contact and property, availability is reconfirmed, and renters are told never to pay before a viewing.

## Operating Context

- Public marketplace: home, search (list and map, URL-backed filters, saved searches), listing detail (gallery, terms, units, rules, nearby schools and landmarks, inquiry and viewing flows, reporting), school pages, landlord profiles, a landlord landing page and a safety guide.
- Renter account: saved places with side-by-side comparison, inquiry inbox, viewing requests, profile.
- Landlord dashboard: properties and units, listings, inquiries, viewing requests, verification, profile.
- Admin console: overview with attention queues, listing moderation, verifications, reports, users, landlords, analytics.
- Payments happen offline between renter and landlord; the platform never takes money.

## Capabilities and Constraints

- React + Vite + Tailwind web app in `apps/web`; mock services in front of local data. Conventions are in the repo-root CLAUDE.md.
- Demo build: listings, landlords and people are fictional; place, school and landmark names are real; coordinates are approximate; walking times are estimates. UI wording must stay consistent with that.
- Local terms used as-is: CR, bedspace, advance, deposit, boarding house.
- Move-in cost is shown with `moveInEstimate()` and labelled as an estimate. Utilities live only in the rental terms, never in amenities.

## Brand Commitments

- The name **Abong** ("house" in Pangasinan) and the house-shaped logo mark are kept.
- Colours and typefaces are not binding and may be replaced. The brand is described as a temporary working identity, with brand values kept in one place (`constants/app.ts`, `docs/design-system.md`).
- Copy is sentence case and plain, using local terms. No all-caps labels, no "·"-joined metadata, no arrows in button text.

## Evidence on Hand

- Rental photography in `apps/web/public/photos/` (interiors, exteriors, rooms).
- Real Pangasinan town and school names, with approximate coordinates and a gulf map illustration.
- No real testimonials, reviews, user counts, press or partner logos exist. None may be invented.

## Product Principles

1. Show the money plainly: rent, advance, deposit and the move-in estimate are always easy to find.
2. Trust is evidence, not decoration: say what was checked and when.
3. Start from where the renter will be: a school, a workplace or a town.
4. Phones first for renters; density for landlords and admins.
5. Never pay before seeing the place.

## Accessibility & Inclusion

Keep the skip link and `main#main` focus behaviour, labelled icon-only buttons, ARIA wiring through `FormField`, and `prefers-reduced-motion` handling. Many renters use mid-range Android phones on mobile data, so weight and touch targets matter.
