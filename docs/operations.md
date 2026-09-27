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

Photos are stored in `media`. Use a PostgreSQL backup for a complete restore; the JSON export does not contain photo bytes. Preserve the original source media.

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
