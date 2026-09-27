# Operation and safe cutover

## Runtime configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing PostgreSQL internal URL; keep out of source and logs |
| `APP_USERS` | JSON array of `{id,name,passwordHash}` with salted scrypt hashes |
| `IMPORT_TOKEN` | At least 32 random characters for operator import/export |
| `NODE_ENV` | `production` on Render; enables secure session cookies |
| `PORT` | Supplied by Render |

Without a database URL the shell shows a setup notice and `/api/health` returns 503. Never describe that as a functioning collection. A connection or schema failure prevents startup.

Import credentials are separate from user passwords. Removing a user from `APP_USERS` revokes their sessions' access. When responding to a suspected password compromise, rotate the password and revoke the user's `sessions` records.

## Operator API

Use `Authorization: Bearer <IMPORT_TOKEN>` over HTTPS:

| Endpoint | Operation |
| --- | --- |
| `POST /api/import` | `{sourceRevision,observedAt,properties,meta}`; never mutates feedback |
| `PUT /api/import/media/:id/:index` | Idempotent JPEG, PNG or WebP upload |
| `GET /api/feedback-export` | All decisions and append-only feedback events |
| `GET /api/export` | Facts, snapshots, feedback, metadata and import ledger; no credentials |
| `GET /api/import/handbook` | Current handbook edition metadata, or null before the first import |
| `POST /api/import/handbook` | Atomic complete-book import with source revision and expected current revision |
| `GET /api/import/references` | Current shared-list snapshot metadata |
| `POST /api/import/references` | Complete reference collection; guarded by `expectedRevision`, preserving notes |

Photos are stored in `media`. Use a PostgreSQL backup for a complete restore; the JSON export does not contain photo bytes. Preserve the original source media.

## Handbook

`/handbook/` and every nested chapter/stylesheet use the existing server-side sessions. Unauthenticated requests return to the login screen and resume the requested chapter after sign-in. Imported text lives in `handbook_files`, never in the public repository or public asset directory. The JSON export includes this table and edition metadata. Handbook pages prohibit scripts, forms, embedding and external resource loading through their content security policy.

Use `scripts/prepare-handbook.py DIST PRIVATE_OUTPUT REVISION SOURCE_DATE OLD_HOUSES_URL` on the existing reading edition. It preserves the chapter text, tables, source links and original date labels, rewrites only the header's property-collection link, and checks every local route and anchor. Keep the output private. Import with `IMPORT_TOKEN` in the environment:

```sh
node scripts/import-handbook.mjs https://YOUR-SERVICE.onrender.com private/handbook.json
```

The importer reads the current revision and supplies it as `expectedRevision`. Concurrent edits return 409. Repeating identical content is idempotent; reusing a revision for different content fails. The complete book changes in one transaction, leaving properties and feedback untouched. This is a reading snapshot; importing it does not create a research or synchronization schedule.

Reuse stable IDs across aliases and relistings. Source snapshots are not new live-market checks. Only session-authenticated feedback routes change decisions, with CSRF, current revision and unique request UUID. Conflicts return 409 without overwriting either person's event.

## Parallel operation and cutover

1. Keep the original Drive register, original Site and both schedules intact.
2. Verify imported IDs, scores, prices, costs, source history, photos and decisions.
3. Verify both users' sign-ins and shared saves. Do not send invitations automatically.
4. Before treating the new site as decision authority, update scheduled workflows to read `/api/feedback-export` before searching and import refreshed snapshots after updating Drive.
5. Read the original D1 tables again at cutover; preserve any intervening decisions without overwriting newer ones. There is no destructive feedback reset route.
6. Once synchronization works, update register links and retire the old decision controls.

Closed and On hold remain excluded after price changes. Comments guide preferences; they do not authorize hard-requirement changes, assumptions about permissions or messages to agents. Neither Interested nor Favourite authorizes a budget exception.

## Service limits

The development database expires on 26 October 2026. Upgrade or migrate before then, preserving new feedback. No paid plan is enabled automatically. Free web services may have cold starts. Monitor `/api/health` and Render logs without logging credentials or private comments.

The service itself sends no email and contacts no agents. A separately authorized scheduled assistant workflow can refresh references and send screening results through the user's connected email account.

## Shared-list references

`/references` and `/references/<Idealista-ID>` open the separate reference collection. All source data, list invitation URLs and notes are session-protected API responses, held in PostgreSQL. Never commit a private import manifest, source snapshot or invitation token. Source listing images use validated Idealista image URLs and no-referrer requests, with a fallback when unavailable. Image availability is not guaranteed.

Read `server/references.js` for the exact validated import shape. A complete manifest has `sourceRevision`, `expectedRevision`, `observedAt`, `listName`, `sourceUrl` and `homes`. Every home has its stable Idealista ID, canonical URL, name, observed price, region/province, position, scoped area/land text, optional validated photo, verified dossier `matches`, `matchNote`, optional `duplicateOf` and an `assessment`. An assessment contains `verdict` (`outside-brief`, `concern`, `potential`, `needs-review`), summary, advertised positives, verification questions and evidence basis (`Listing detail` or `Shared list`). Review labels are screening judgments, not technical or legal approvals. Existing owner notes are append-only and are never imported from a source snapshot.

Run `scripts/import-references.mjs SITE PRIVATE_MANIFEST` with `IMPORT_TOKEN` in the environment. It reads the current revision first. A reused revision with different content or a stale expected revision fails. A source listing absent from the complete import becomes `listed=false`; its last assessment and notes remain. Do not import a partial crawl as a complete list. Count unique listing IDs across every observed pagination link and reconcile that count with the source's displayed count. An inaccessible detail page can retain its prior assessment with the true prior evidence date; never claim a fresh detailed review without reading it. For a changed collection, use a new revision and actual observation date.

`GET /api/export` includes `reference_homes`, `reference_notes` and the `idealistaReferences` metadata. Read these and the ordinary property decisions before screening, so feedback and known aliases guide judgment. A new URL is not necessarily a new physical property. Preserve verified matches, flag conflicting prices/area and never choose a cheaper unsupported alias. A saved reference does not change the purchase ceiling or geography, and it does not automatically enter the ranked collection.

For user-authorized screening email, separate evidenced conflicts from unresolved feasibility concerns. Each flagged home needs a clear explanation and canonical listing link; never remove favourites on the user's behalf. Read the current Master Profile each run. Price, missing information and renovation potential are separate questions: do not reject solely because current room count is below the future goal or because a permission is unknown. Compare against the previous export and sent screening email to identify new and changed issues, and disclose access failures rather than interpreting them as a clean screening.
