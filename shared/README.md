# shared/ (reserved)

Future home for code used by more than one of web, mobile and backend:

- Domain types (today in `apps/web/src/types`)
- Validation schemas and API contracts
- Constants such as property types, amenities and status labels (today in `apps/web/src/constants`)
- Pure utilities: peso formatting, distance math (today in `apps/web/src/lib`)

The web app stays self-contained until a second consumer exists. At that point, move the modules above into a `shared` workspace package and point imports at it.
