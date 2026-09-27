import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';

const secret = 'references-test-secret-at-least-32-characters';
const home = { id: '12345678', name: 'Example farmhouse', url: 'https://www.idealista.it/immobile/12345678/', price: 190000, region: 'Marche', province: 'Ancona', position: 0, area: '300 m² advertised', land: 'Not established', photo: null, matches: ['MR001'], assessment: { verdict: 'needs-review', summary: 'Owner privacy needs checking.', positives: [], questions: ['Obtain a measured plan.'], basis: 'Listing detail' } };
const bundle = { sourceRevision: 'r1', observedAt: '2026-09-27T12:00:00Z', listName: 'Example list', sourceUrl: 'https://www.idealista.it/fav-list/12345?example=1', homes: [home] };
let pg, app, alice, bob, csrf;
before(async () => {
  pg = new PGlite(); await pg.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  await pg.query('INSERT INTO properties(id,data,content_hash) VALUES($1,$2,$3)', ['MR001', JSON.stringify({ id: 'MR001', name: 'Assessed farmhouse', price: 190000, score: 60, region: 'Marche', province: 'Ancona' }), 'unchanged']);
  await pg.query("INSERT INTO decisions(property_id,status,favourite) VALUES('MR001','Closed',true)");
  app = createApp({ db: { query: (...a) => pg.query(...a), transaction: fn => pg.transaction(fn) }, importToken: secret, users: ['alice','bob'].map(id => ({ id, name: id, passwordHash: hashPassword('test-password-'+id) })) });
  alice = request.agent(app); bob = request.agent(app);
  for (const [client,id] of [[alice,'alice'],[bob,'bob']]) await client.post('/api/login').send({ username: id, password: 'test-password-'+id }).expect(200);
  csrf = (await alice.get('/api/session')).body.csrf;
});
after(async () => pg.close());
const post = value => request(app).post('/api/import/references').set('Authorization', `Bearer ${secret}`).send(value);

test('shared references require login and imports require operator authorization', async () => {
  for (const path of ['/api/references','/api/references/12345678','/api/import/references']) await request(app).get(path).expect(401);
  await alice.post('/api/import/references').send(bundle).expect(401);
  await post(bundle).expect(200);
  for (const client of [alice,bob]) {
    const r = await client.get('/api/references').expect(200);
    assert.equal(r.body.homes.length, 1); assert.match(r.headers['cache-control'], /no-store/);
    assert.equal((await client.get('/api/references/12345678')).body.home.name, home.name);
  }
  await request(app).get('/references/12345678').expect(200);
  await alice.get('/api/references/12345678?before=NaN').expect(400);
});
test('notes are shared, CSRF protected and idempotent; source refresh preserves notes and closed dossiers', async () => {
  const note = { requestId: randomUUID(), comment: 'We like the stone and the garden.' };
  const path = '/api/references/12345678/notes';
  await alice.post(path).send(note).expect(403);
  await alice.post(path).set('X-CSRF-Token',csrf).send(note).expect(200);
  assert.equal((await alice.post(path).set('X-CSRF-Token',csrf).send(note)).body.repeated, true);
  await alice.post(path).set('X-CSRF-Token',csrf).send({ ...note, comment: 'Different body' }).expect(409);
  assert.equal((await bob.get('/api/references/12345678')).body.notes.length, 1);
  await post({ ...bundle, sourceRevision:'r2', expectedRevision:'r1', homes:[{...home, price:180000}] }).expect(200);
  const d = (await bob.get('/api/references/12345678')).body;
  assert.equal(d.home.price,180000); assert.equal(d.notes[0].comment,note.comment);
  assert.equal((await pg.query("SELECT status FROM decisions WHERE property_id='MR001'")).rows[0].status,'Closed');
  assert.equal((await pg.query("SELECT content_hash FROM properties WHERE id='MR001'")).rows[0].content_hash,'unchanged');
});
test('stale, malformed and conflicting imports are rejected; absent listings keep their notes', async () => {
  const b2 = { ...bundle, sourceRevision:'r2', expectedRevision:'r1', homes:[{...home, price:180000}] };
  assert.equal((await post(b2)).body.repeated,true);
  await post({ ...b2, homes:[home] }).expect(409);
  await post({ ...bundle, sourceRevision:'r3', expectedRevision:'r1' }).expect(409);
  await post({ ...bundle, homes:[home,home] }).expect(400);
  await post({ ...bundle, homes:[{...home,url:'https://evil.example/immobile/12345678/'}] }).expect(400);
  await post({ ...bundle, homes:[{...home,photo:{url:'https://evil.example/a.jpg',alt:'photo'}}] }).expect(400);
  await post({ ...bundle, sourceRevision:'r3', expectedRevision:'r2', homes:[{...home,matches:['MR999']}] }).expect(400);
  await post({ ...bundle, sourceRevision:'r3', expectedRevision:'r2', homes:[{...home,id:'87654321',url:'https://www.idealista.it/immobile/87654321/'}] }).expect(200);
  const old = (await bob.get('/api/references/12345678')).body;
  assert.equal(old.home.listed,false); assert.equal(old.notes.length,1);
  const exported = (await request(app).get('/api/export').set('Authorization',`Bearer ${secret}`)).body;
  assert.equal(exported.reference_homes.length,2); assert.equal(exported.reference_notes.length,1);
});
