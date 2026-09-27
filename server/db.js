import pg from 'pg';
import { readFile } from 'node:fs/promises';

export async function connectDatabase(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is required. Connect the existing Render PostgreSQL database.');
  const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
  pool.on('error', () => console.error('database_connection_error'));
  return {
    query: (sql, args) => pool.query(sql, args),
    async transaction(fn) {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
}

export async function migrate(db) {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await db.transaction(async tx => { await tx.query('SELECT pg_advisory_xact_lock(742001)'); await tx.query(sql); });
}
