# Domain model

Types live in `apps/web/src/types`. They're written to move into `shared/` once the backend exists.

```text
User (role: renter | landlord | admin)
├── RenterProfile          occupation, school, budget, move-in date
└── LandlordProfile        display name, response stats, verifications{identity, contact, property}
        │
        └── Property       one building/house; address, coordinates, photos, amenities,
            │              gender policy, house rules, rental terms, status, property verification
            └── RentalUnit room / bedspace set / studio / whole house
                           arrangement (private|shared), pricing (per-unit|per-bed),
                           monthlyRent, capacity, occupiedBeds, status, availableFrom

Listing = Property + computed public fields
          priceFrom/To + pricingBasis (from the cheapest open unit), open units/beds,
          isVerified (identity + property verified), nearest university with distance

Inquiry          renter ↔ landlord thread about a listing (optional unit), messages[], unread counts
ViewingRequest   date, time, optional unit and note; pending → confirmed|declined → completed|cancelled
Favorite         listing id + saved time
SavedSearch      named SearchFilters
Report           listing, reason, details, status: open → investigating → resolved|dismissed
VerificationRequest  landlord, type, optional property, documents (names only), status, reviewer note
ActivityEvent, AdminMetric, Notification
Municipality, University, Landmark   reference data with coordinates
```

## Status lifecycles

**Listing (`Property.status`):** `draft → pending-review → active`, with `rejected`, `suspended` and `archived` as side states. The admin "request changes" action sends a listing back to `draft`.

A listing is public only when its status is `active` and its landlord's account isn't suspended or deactivated; this is worked out from the account, so reactivating restores the listing. On a live listing, changing the address or a unit's rent, or adding a unit, sends it back to `pending-review`. Other edits stay live.

**Unit:** `available | occupied | reserved | maintenance`. Setting a unit occupied fills its beds; changing availability refreshes the property's "availability confirmed" timestamp.

**Verification:** `not-started → pending → verified | rejected | needs-update`. A listing shows **Verified** only when the landlord's identity *and* the property are verified.

## Search filters

`SearchFilters` (URL-serialised): `location` (town slug) or `near` (school slug or landmark id), `types[]`, `priceMin/Max`, `arrangement`, `gender` (female/male includes co-ed), `amenities[]` (unit-level facts like private CR and aircon count), `maxMinStay`, `availableNow`, `verifiedOnly`, `sort`.
