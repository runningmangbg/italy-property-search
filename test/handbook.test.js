import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';

const secret = 'test-handbook-import-secret-at-least-32-characters';
let pg, app, alice, bob;
const bundle = {
  sourceRevision: 'book-v1', sourceDate: '2026-09-20',
  files: [
    { path: 'index.html', content: '<!doctype html><html lang="sv"><link rel="stylesheet" href="assets/handbook.css"><a href="abruzzo/atessa.html">Atessa</a><a href="/">Husen</a></html>' },
    { path: 'abruzzo/atessa.html', content: '<!doctype html><html lang="sv"><h1>Atessa — vår ortprofil</h1><a href="../index.html">Alla kapitel</a></html>' },
    { path: 'assets/handbook.css', content: 'body{font-size:17px}' },
  ],
};
before(async () => {
  pg = new PGlite(); await pg.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  app = createApp({ db: { query: (...args) => pg.query(...args), transaction: fn => pg.transaction(fn) }, importToken: secret,
    users: ['alice', 'bob'].map(id => ({ id, name: id, passwordHash: hashPassword('test-password-' + id) })) });
  alice = request.agent(app); bob = request.agent(app);
  for (const [client, id] of [[alice, 'alice'], [bob, 'bob']]) await client.post('/api/login').send({ username: id, password: 'test-password-' + id }).expect(200);
});
after(async () => pg.close());

test('book pages and CSS require login; only operators can import', async () => {
  for (const path of ['/handbook/', '/handbook/abruzzo/atessa.html', '/handbook/assets/handbook.css']) {
    const r = await request(app).get(path).expect(302);
    assert.equal(r.headers.location, '/?next=' + encodeURIComponent(path));
    assert.match(r.headers['cache-control'], /no-store/);
    assert.ok(!r.text.includes('vår ortprofil'));
  }
  await alice.post('/api/import/handbook').send(bundle).expect(401);
  await request(app).get('/api/import/handbook').expect(401);
});
test('complete imports are readable by both accounts, with original text and strict CSP', async () => {
  await request(app).post('/api/import/handbook').set('Authorization', `Bearer ${secret}`).send(bundle).expect(200);
  for (const client of [alice, bob]) {
    await client.get('/handbook').expect(308).expect('Location', '/handbook/');
    assert.equal((await client.get('/handbook/').expect(200)).text, bundle.files[0].content);
    const chapter = await client.get('/handbook/abruzzo/atessa.html').expect(200);
    assert.equal(chapter.text, bundle.files[1].content);
    assert.match(chapter.headers['content-security-policy'], /script-src 'none'/);
    assert.match(chapter.headers['cache-control'], /no-store/);
    await client.get('/handbook/assets/handbook.css').expect(200).expect('Content-Type', /text\/css/);
    await client.get('/handbook/missing.html').expect(404);
    await client.get('/handbook/%2e%2e%2fserver%2fapp.js').expect(404);
  }
});
test('invalid, reused or stale revisions cannot replace the existing book', async () => {
  const post = value => request(app).post('/api/import/handbook').set('Authorization', `Bearer ${secret}`).send(value);
  assert.equal((await post(bundle).expect(200)).body.repeated, true);
  await post({ ...bundle, sourceDate: '2026-09-21' }).expect(409);
  await post({ ...bundle, sourceRevision: 'book-v2' }).expect(409);
  await post({ ...bundle, files: [...bundle.files, bundle.files[0]] }).expect(400);
  await post({ ...bundle, files: bundle.files.slice(1) }).expect(400);
  await post({ ...bundle, files: [{ path: '../index.html', content: 'bad' }, bundle.files[2]] }).expect(400);
  assert.equal((await alice.get('/handbook/abruzzo/atessa.html').expect(200)).text, bundle.files[1].content);
  await post({ ...bundle, sourceRevision: 'book-v2', expectedRevision: 'book-v1' }).expect(200);
  const meta = await request(app).get('/api/import/handbook').set('Authorization', `Bearer ${secret}`).expect(200);
  assert.equal(meta.body.handbook.sourceRevision, 'book-v2');
  const csrf = (await alice.get('/api/session')).body.csrf;
  await alice.post('/api/logout').set('X-CSRF-Token', csrf).expect(200);
  await alice.get('/handbook/abruzzo/atessa.html').expect(302);
  await bob.get('/handbook/abruzzo/atessa.html').expect(200);
});
