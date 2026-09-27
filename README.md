# Our Italian Home

A private collection for exploring and comparing homes in Abruzzo, Marche and the Dolomiti area, with a shared decision history for a future permanent home and small B&B.

## Application

- Four-property pages with ranking, region/province/search filters, price ordering and comparison of up to three homes.
- Full dossiers, original photos and credits, evidence classes, owner and guest layout hypotheses, score breakdowns, costs, aliases and price observations.
- Ranked, price-watch, favourite, on-hold and closed views; dated search reports and the authoritative search brief.
- Individual password sign-ins, server-side sessions, CSRF protection and rate-limited login.
- Shared PostgreSQL comments and decisions, atomic writes, optimistic concurrency and idempotent retries.
- Authenticated imports preserving stable IDs, historical snapshots, source aliases and every saved decision.
- The Swedish location handbook at `/handbook/`, with chapter navigation and the same sign-in as the property collection.

The purchase target is €200,000. €200,000–€225,000 may be considered for a strong fit; €225,000–€250,000 needs an unusually strong case. Homes above €250,000 have no active rank. The latest Master Profile supersedes the older site's over-ceiling exception control; this application does not provide that obsolete exception. Existing fit scores are preserved, not recalculated by migration. A rank does not establish affordability, planning permission or current availability.

## Deployment

Node.js 24, Express and PostgreSQL, on Render in Frankfurt. `render.yaml` provisions only a free web service, reusing the existing database.

1. Run `npm ci` and `node scripts/create-users.mjs` to generate ignored access details and deployment settings.
2. Configure `APP_USERS`, `IMPORT_TOKEN` and `NODE_ENV=production` in Render from `private/deploy-env.json`.
3. Set `DATABASE_URL` to the existing database's **internal** connection URL.
4. Build: `npm ci --omit=dev`. Start: `npm start`. Health check: `/api/health`.
5. Import the private migration bundle using `scripts/import.mjs`.

No personal dossiers, handbook content, photos, comments, source snapshots, database credentials or login passwords belong in this public repository. Public assets contain only the app shell. All property data, handbook pages, styles and images require authentication.

The development database expires on **26 October 2026**. Arrange a durable database plan or migration before then. No paid upgrade is performed by this application.

## Migration and updates

Drive remains authoritative for facts, scores, costs and source history during parallel operation. The original Site's live D1 database owns its existing feedback; spreadsheet feedback tabs are historical. The live D1 tables were verified empty on 27 September 2026. Read them again at cutover.

`scripts/prepare-import.py` builds a private bundle from a complete current Drive snapshot and the original Site checkout. It joins stable IDs, validates score totals and preserves photo attribution. `scripts/import.mjs` validates photo checksums and sends the bundle to the API:

```sh
node scripts/import.mjs https://YOUR-SERVICE.onrender.com private/import
```

Provide `IMPORT_TOKEN` through the environment. Imports are transactional and idempotent by source revision; changed content with the same revision returns 409. They never reset feedback, reopen closed/held homes or delete absent properties.

The original schedules remain unchanged until cutover. Deploying this code does not install a scraper or automatically switch scheduled searches to the new API. See [operations](docs/operations.md).

## Local verification

```sh
npm ci
npm run check
npm test
cp .env.example .env
npm run dev
```

`DEV_DATABASE` enables local embedded PostgreSQL (PGlite). `DEV_PREVIEW=1` enables a local preview identity and binds only to loopback. Production never enables this identity or falls back to local storage.

Tests cover access, CSRF, cross-user feedback, conflicts, idempotent saves, retained closures after price drops, source history, invalid media and logout.
