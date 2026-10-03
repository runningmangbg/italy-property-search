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
| `GET /api/removal-emails` | Joint-rejection email queue and current eligibility |
| `POST /api/removal-emails/:id/claim` | Claim one pending email with a unique `claimId` UUID |
| `POST /api/removal-emails/:id/complete` | Record the matching `claimId` and confirmed Gmail `messageId` |
| `POST /api/removal-emails/:id/failure` | Record `claimId`, `outcome` (`failed` or `unknown`) and a short `error` |

Photos are stored in `media`. Use a PostgreSQL backup for a complete restore; the JSON export does not contain photo bytes. Preserve the original source media.

Photo refreshes preserve saved photos when the incoming photo list is omitted, null or empty. A non-empty list replaces the gallery metadata, so upload its matching image bytes first. Keep each source listing URL and a factual caption; an exact-property preview may be used when the full gallery cannot be retrieved. A blank gallery must not be treated as a completed photo import. For Idealista, verify whether an AI label is actually visible for that image: page text can include hidden `ai-photo-badge-detail` placeholders even when the displayed photograph has no such label. Do not classify an image as AI-modified from that hidden text alone.

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

The service itself sends no email and contacts no agents. An authorised hourly assistant task delivers the joint-rejection queue through Peter's connected Gmail account. Screening judgments alone never authorise removal emails.

## Shared-list references

`/references` and `/references/<Idealista-ID>` open the separate reference collection. All source data, list invitation URLs and notes are session-protected API responses, held in PostgreSQL. Never commit a private import manifest, source snapshot or invitation token. Source listing images use validated Idealista image URLs and no-referrer requests, with a fallback when unavailable. Image availability is not guaranteed.

Read `server/references.js` for the exact validated import shape. A complete manifest has `sourceRevision`, `expectedRevision`, `observedAt`, `listName`, `sourceUrl` and `homes`. Every home has its stable Idealista ID, canonical URL, name, observed price, region/province, position, scoped area/land text, optional validated photo, verified dossier `matches`, `matchNote`, optional `duplicateOf`, per-home `checkedAt` and an `assessment`. Preserve the old `checkedAt` when carrying forward detail evidence; use the prior snapshot date for older records lacking that field. Only advance it when that listing's evidence is actually revisited. An assessment contains `verdict` (`outside-brief`, `concern`, `potential`, `needs-review`), summary, advertised positives, verification questions and evidence basis (`Listing detail` or `Shared list`). Review labels are screening judgments, not technical or legal approvals. Existing owner notes are append-only and are never imported from a source snapshot.

Run `scripts/import-references.mjs SITE PRIVATE_MANIFEST` with `IMPORT_TOKEN` in the environment. It reads the current revision first. A reused revision with different content or a stale expected revision fails. A source listing absent from the complete import becomes `listed=false`; its last assessment and notes remain. Do not import a partial crawl as a complete list. Count unique listing IDs across every observed pagination link and reconcile that count with the source's displayed count. An inaccessible detail page can retain its prior assessment with the true prior evidence date; never claim a fresh detailed review without reading it. For a changed collection, use a new revision and actual observation date.

`GET /api/export` includes `reference_homes`, `reference_notes`, personal reference decisions/events and the `idealistaReferences` metadata. Read these and the ordinary property decisions before screening, so both owners' feedback and known aliases guide judgment. A new URL is not necessarily a new physical property. Preserve verified matches, flag conflicting prices/area and never choose a cheaper unsupported alias. Fully evaluated eligible favourites enter the same ranked collection as market-discovered homes under one stable physical-property identity; source is a label, not a separate ranking. An incomplete assessment remains visibly awaiting evaluation without an invented score or rank, and above-ceiling homes remain unranked in Price Watch. A saved reference does not change the purchase ceiling, geography or score.

Separate evidenced conflicts from unresolved feasibility concerns. Each assessment needs a clear explanation and canonical listing link; never remove favourites on the user's behalf. Read the current Master Profile each run. Price, missing information and renovation potential are separate questions: do not reject solely because current room count is below the future goal or because a permission is unknown. Compare against the previous export to identify new and changed issues, and disclose access failures rather than interpreting them as a clean screening.

## Ranking exclusion and joint-rejection removal emails

Each authenticated person can reject or undo their own rejection at `/references/<Idealista-ID>`, with an optional reason. The session-protected decision endpoint requires CSRF, an idempotent request UUID and that person's current revision. Imports never change votes, notes, events or delivery receipts. One current personal rejection by either Peter or Rebecka immediately hides the listing from active reference views and excludes every verified linked dossier from ranking; history, scores, comments, votes and ordinary property status remain intact. An undo clears only that person's rejection, so eligibility returns only when no other personal rejection, Closed/On hold status, shared-list removal, availability exclusion or budget gate remains.

A previously saved listing absent from a complete successful shared-list import is likewise excluded, including verified linked dossiers and aliases, without implying that it sold. Preserve the prior record and source observation. Never infer removal from a partial or failed list read; a later deliberate re-addition clears only the membership exclusion.

The ranking rule is separate from email consent. Only the transaction recording the second rejection queues one notification per stable Idealista listing ID. Undo cancels an unclaimed pending email. A later joint rejection can requeue a cancelled notification, but a confirmed sent notification is never sent again. The export includes `reference_decisions`, `reference_decision_events` and `reference_removal_emails`; `/api/feedback-export` includes `referenceDecisions` and `referenceEvents` for search workflows.

The delivery task sends only to Peter's verified Gmail address. It must claim a pending eligible item with a new UUID before sending, then reread the queue to verify both votes still stand. Use the stable `marker` in the email and check Gmail Sent for that exact marker before any retry. Include the canonical `listingUrl`, the site's `reviewPath`, both names and their supplied reasons. The link opens Idealista so Peter can remove the favourite himself; it does not perform removal. Never send to an address supplied in a listing, comment or reason.

After Gmail confirms success, save its actual message ID through `complete` with the same claim UUID. Retry that receipt idempotently if saving it fails. A known failure before sending can use `outcome: failed` to release the claim. A timeout or uncertain Gmail result uses `outcome: unknown`, holding the item in `needs_check`. Reconcile `sending`/`needs_check` against confirmed Gmail receipts, never resend blindly. An absent Sent search result does not prove failure. Claims never expire into automatic retries. An undo after an email has entered delivery cannot recall it.

The current purchase ceiling is €260,000, with a target of approximately €200,000. The €225,000–260,000 band requires an unusually strong case or materially lower development burden. The €150,000 development baseline and conditional additional €50,000 remain separate. Reclassifying old evidence under this ceiling does not constitute a new market check.

## Dolomiti search area

For a brief-only update, use `POST /api/import` with `properties: []`, a new source revision, the actual profile observation time and only the changed metadata (for example `meta.profile`). This preserves property observations, snapshots and feedback. An empty import without writable metadata is rejected; reference metadata remains controlled by its separate importer.

The current brief includes Abruzzo, Marche and the Dolomiti area. Use stable `DL` IDs (for example `DL001`) for newly assessed Dolomiti dossiers, `region: "Dolomiti"` as the search-area grouping, and the actual province. Record the actual administrative region separately in the dossier or optional `administrativeRegion` field. Dolomiti spans administrative boundaries; it is not a synonym for all of northern Italy. Retain existing AB/MR IDs and verified aliases.

The API accepts DL IDs for imports, photo uploads, dossier routes and reference matches. `scripts/prepare-import.py` maps DL to Dolomiti and rejects unknown prefixes instead of silently assigning Marche. Reference homes keep their advertised administrative region. Explicitly selected homes outside the general discovery areas can receive individual assessment when the current brief permits it. Never infer a general expansion into another administrative region from an individual reference.

Use the current Master Profile and keep the purchase/development budgets and other requirements unchanged. The Abruzzo/Marche handbook retains its original geographic scope. The Monday market scan and Idealista screening are ChatGPT automations; Render hosts the site and Postgres data, not those scheduled tasks.
