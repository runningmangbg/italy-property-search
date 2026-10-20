import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setImmediate as tick } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../server/app.js';
import { allProperties } from '../server/domain.js';
import { createExportHandler, EXPORT_TABLES } from '../server/export.js';

const secret = 'export-test-operator-token-long-enough';
let pg, db, app;
before(async () => {
  pg = new PGlite();
  await pg.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  db = { query: (...args) => pg.query(...args), transaction: fn => pg.transaction(fn) };
  app = createApp({ db, importToken: secret });
  const property = { id: 'AB001', name: 'Caffè farmhouse', price: 190000, score: 70, region: 'Abruzzo', province: 'TE', dossier: [{topic: 'Facts', text: 'Quotes " and newlines\nremain intact.'}] };
  await db.query('INSERT INTO properties VALUES($1,$2,$3,$4)', ['AB001', JSON.stringify(property), 'hash', '2026-10-19T12:00:00.123456Z']);
  await db.query("INSERT INTO decisions(property_id,status) VALUES('AB001','Closed')");
  await db.query("INSERT INTO feedback_events(request_id,property_id,revision,previous_status,status,favourite,comment,actor_id,actor_name) VALUES('11111111-1111-4111-8111-111111111111','AB001',1,'Open','Closed',false,'Keep this exact comment.','peter','Peter')");
  await db.query("INSERT INTO property_snapshots(property_id,source_revision,observed_at,data,content_hash) SELECT 'AB001','revision-'||n,now(),$1,'hash-'||n FROM generate_series(1,67) n", [JSON.stringify(property)]);
  await db.query("INSERT INTO project_meta(key,value) VALUES('weeklyRuns',$1)", [JSON.stringify([{ date: '2026-10-12', status: 'incomplete' }])]);
  await db.query("INSERT INTO handbook_files VALUES('index.html','<p>Original handbook</p>','handbook-hash')");
  await db.query("INSERT INTO sessions VALUES('never-export-this','peter','Peter','private-csrf',now()+interval '1 day')");
});
after(async () => pg.close());

test('export preserves the entire old JSON contract and never mutates records', async () => {
  const expected = {};
  for (const table of EXPORT_TABLES) expected[table] = (await db.query(`SELECT * FROM ${table}`)).rows;
  expected.collection = await allProperties(db);
  const response = await request(app).get('/api/export').set('Authorization', `Bearer ${secret}`).expect(200);
  const { exportedAt, ...actual } = response.body;
  assert.ok(Number.isFinite(Date.parse(exportedAt)));
  assert.deepEqual(actual, JSON.parse(JSON.stringify(expected)));
  assert.equal(actual.property_snapshots.length, 67);
  assert.equal(actual.collection[0].status, 'Closed');
  assert.equal(actual.collection[0].rank, null);
  assert.match(response.headers['cache-control'], /no-store/);
  assert.doesNotMatch(response.text, /never-export-this|private-csrf/);
  for (const table of EXPORT_TABLES) assert.deepEqual((await db.query(`SELECT * FROM ${table}`)).rows, expected[table]);
});

test('exports still require operator credentials', async () => {
  await request(app).get('/api/export').expect(401);
  await request(app).get('/api/export').set('Authorization', 'Bearer incorrect').expect(401);
});

// A slow/disconnected HTTP consumer must stop database reads, rather than
// accumulating the export in the writable stream's queue.
class Response extends EventEmitter {
  chunks = [];
  headersSent = false;
  blocked = true;
  destroyed = false;
  type() { return this; }
  set(name, value) { this[name] = value; return this; }
  status(value) { this.statusCode = value; return this; }
  json(value) { this.body = value; return this; }
  write(chunk) { this.headersSent = true; this.chunks.push(chunk); return !this.blocked; }
  end(chunk) { this.chunks.push(chunk); this.finished = true; }
  destroy() { this.destroyed = true; this.emit('close'); }
}
const fakeDb = (failOnFetch = false) => {
  const state = { queries: [], rolledBack: false, committed: false };
  return {
    state,
    async transaction(fn) {
      try {
        await fn({ query: async sql => {
          state.queries.push(sql);
          if (failOnFetch && sql.startsWith('FETCH')) throw Object.assign(new Error('query failed'), { code: 'TEST_FAILURE' });
          return { rows: [] };
        }});
        state.committed = true;
      } catch (error) { state.rolledBack = true; throw error; }
    },
  };
};

test('backpressure bounds reads, competing exports retry, and disconnect releases the transaction', async () => {
  const database = fakeDb(), handler = createExportHandler(database), first = new Response();
  const errors = [];
  const pending = handler({}, first, error => errors.push(error));
  await tick();
  assert.deepEqual(database.state.queries, ['SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY']);
  const second = new Response();
  await handler({}, second, error => errors.push(error));
  assert.equal(second.statusCode, 503);
  assert.equal(second['Retry-After'], '30');
  first.destroy();
  await pending;
  assert.equal(database.state.rolledBack, true);
  assert.equal(database.state.committed, false);
  assert.equal(first.finished, undefined);
  assert.equal(errors.length, 0);
  // The disconnected export must not leave the application permanently busy.
  const third = new Response(); third.blocked = false;
  await handler({}, third, error => errors.push(error));
  assert.equal(third.statusCode, undefined);
  assert.ok(third.finished);
  assert.deepEqual(JSON.parse(third.chunks.join('')).collection, []);
});

test('a mid-export database failure produces an invalid/incomplete download, not silent data loss', async t => {
  const database = fakeDb(true), response = new Response(); response.blocked = false;
  const log = t.mock.method(console, 'error', () => {});
  await createExportHandler(database)({}, response, error => { throw error; });
  assert.equal(response.destroyed, true);
  assert.equal(response.finished, undefined);
  assert.equal(database.state.rolledBack, true);
  assert.throws(() => JSON.parse(response.chunks.join('')));
  assert.deepEqual(log.mock.calls[0].arguments, ['export_failed', { code: 'TEST_FAILURE' }]);
});

test('a failed transaction commit cannot produce a valid export', async t => {
  const database = { transaction: async fn => {
    await fn({ query: async () => ({ rows: [] }) });
    throw Object.assign(new Error('commit failed'), { code: 'TEST_COMMIT' });
  } };
  const response = new Response(); response.blocked = false;
  t.mock.method(console, 'error', () => {});
  await createExportHandler(database)({}, response, error => { throw error; });
  assert.equal(response.destroyed, true);
  assert.equal(response.finished, undefined);
  assert.throws(() => JSON.parse(response.chunks.join('')));
});

test('128 MiB of synthetic history exports with a 64 MiB heap limit', async () => {
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--max-old-space-size=64', new URL('./fixtures/export-memory.js', import.meta.url).pathname,
  ], { timeout: 30000 });
  const result = JSON.parse(stdout);
  assert.ok(result.bytes > 128 * 1024 * 1024);
  assert.ok(result.peakHeap < 64 * 1024 * 1024);
  assert.match(result.suffix, /^,"exportedAt":".+"}$/);
});
