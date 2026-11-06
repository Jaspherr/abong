# apps/admin (reserved)

The admin console currently lives inside the web app under `/admin` (`apps/web/src/pages/admin`, `apps/web/src/features/admin`), sharing its design system and services.

Extract it here only if there's a concrete reason: separate deployment and access controls (e.g. VPN/SSO-only hosting), a different release cadence, or bundle isolation from the public app.
