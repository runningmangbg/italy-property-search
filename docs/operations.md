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

The service sends no email, contacts no agents and creates no recurring job. Scheduled integration is a separate cutover step; verify it before claiming unattended synchronization.
