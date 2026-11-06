# backend/ (reserved)

The API is **not implemented yet**. The web app runs against mock services in `apps/web/src/services` (see [docs/backend-integration.md](../docs/backend-integration.md) for the contract it expects).

When built, the backend will own:

- Authentication and session management; user and role management
- Renter and landlord profiles
- Properties, rental units and listing lifecycle (draft → review → active, suspension, archive)
- Inquiries and messaging (real-time delivery)
- Viewing requests and their state transitions
- Favorites and saved searches (with alerts)
- Landlord verification: identity, contact (OTP) and property documents, with secure, access-controlled storage
- Reports, moderation queues and audit logs
- Notifications (in-app, email, SMS)
- Geospatial search (distance to schools/landmarks, map bounding boxes)
- Image storage and processing (resizing, WebP/AVIF, EXIF stripping)
- Analytics and admin operations

Payments are explicitly out of scope for the current product phase.
