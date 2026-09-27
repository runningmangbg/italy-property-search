import { connectDatabase, migrate } from './db.js';
import { createApp } from './app.js';
const production = process.env.NODE_ENV === 'production';
let db;
if (process.env.DATABASE_URL) { db = await connectDatabase(process.env.DATABASE_URL); await migrate(db); }
else if (!production && process.env.DEV_DATABASE) {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite(process.env.DEV_DATABASE);
  db = { query: (...args) => pg.query(...args), transaction: fn => pg.transaction(fn), close: () => pg.close() };
  // PGlite needs statements executed separately for schema setup.
  const { readFile } = await import('node:fs/promises');
  await pg.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
}
if (production && !process.env.APP_USERS) throw new Error('APP_USERS must be configured before publishing.');
const users = JSON.parse(process.env.APP_USERS || '[]');
if (users.some(u => !u.id || !u.name || !/^[0-9a-f]{32}:[0-9a-f]{128}$/.test(u.passwordHash || ''))) throw new Error('Invalid APP_USERS configuration.');
const devPreview = !production && process.env.DEV_PREVIEW === '1';
const app = createApp({ db, users, importToken: process.env.IMPORT_TOKEN, production, devPreview });
const server = app.listen(Number(process.env.PORT || 3000), production ? '0.0.0.0' : '127.0.0.1', () => console.log(db ? 'Property site ready.' : 'Waiting for DATABASE_URL configuration.'));
server.requestTimeout = 30000;
async function stop() { server.close(async () => { if (db) await db.close(); process.exit(0); }); setTimeout(() => process.exit(1), 9000).unref(); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
