import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { budget } from '../server/domain.js';

const secret = 'joint-rejection-test-operator-token-32-chars';
let pg, app;
const clients = {}, csrf = {};
const listing = id => ({ id, name: 'Test reference', url: `https://www.idealista.it/immobile/${id}/`, price: 260000, region: 'Marche', province: 'Ancona', position: 0, area: '300 m²', land: 'Unknown', photo: null, matches: ['MR001'], assessment: { verdict: 'needs-review', summary: 'Check the layout.', positives: [], questions: [], basis: 'Listing detail' } });
const importBundle = { sourceRevision: 'joint-initial', observedAt: '2026-09-27T16:00:00Z', listName: 'Test', sourceUrl: 'https://www.idealista.it/fav-list/12345?test=1', homes: [listing('12345678'), listing('87654321')] };
const operator = (path, body) => request(app).post(path).set('Authorization', `Bearer ${secret}`).send(body);
const queue = async () => (await request(app).get('/api/removal-emails').set('Authorization', `Bearer ${secret}`).expect(200)).body.emails;
async function vote(user, id, rejected, reason = '', extra = {}) {
  const review = (await clients[user].get('/api/references/' + id)).body.home.review;
  return clients[user].post(`/api/references/${id}/decision`).set('X-CSRF-Token', csrf[user]).send({ requestId: randomUUID(), revision: review.decisions.find(d => d.id === user)?.revision || 0, rejected, reason, ...extra });
}
before(async () => {
  pg = new PGlite(); await pg.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  await pg.query('INSERT INTO properties(id,data,content_hash) VALUES($1,$2,$3)', ['MR001', JSON.stringify({ id: 'MR001', name: 'Linked home', region: 'Marche', province: 'AN', price: 260000, score: 80 }), 'test']);
  app = createApp({ db: { query: (...a) => pg.query(...a), transaction: fn => pg.transaction(fn) }, importToken: secret, users: ['peter','rebecka','visitor'].map(id => ({ id, name: id, passwordHash: hashPassword('test-' + id) })) });
  for (const id of ['peter','rebecka','visitor']) { clients[id] = request.agent(app); csrf[id] = (await clients[id].post('/api/login').send({ username: id, password: 'test-' + id })).body.csrf; }
  await operator('/api/import/references', importBundle).expect(200);
});
after(async () => pg.close());

test('260k is inside the ceiling; 260001 stays on watch; held and closed homes stay excluded', () => {
  assert.equal(budget({price:260000}).pool,'ranked'); assert.equal(budget({price:260000}).requiresStrongCase,true);
  assert.equal(budget({price:260001}).pool,'watch'); assert.equal(budget({price:270000}).reductionToCeiling,10000);
  assert.equal(budget({price:255000},{status:'Closed'}).pool,'closed'); assert.equal(budget({price:260000},{status:'On hold'}).pool,'hold');
});
test('each reviewer owns their rejection; one rejection excludes ranking but never queues email', async () => {
  await request(app).get('/api/removal-emails').expect(401);
  await clients.peter.get('/api/removal-emails').expect(401);
  await clients.peter.post('/api/references/12345678/decision').send({}).expect(403);
  assert.equal((await vote('visitor','12345678',true)).status,403);
  assert.equal((await vote('peter','12345678',true,'',{user_id:'rebecka'})).status,400);
  const requestId = randomUUID();
  assert.equal((await vote('peter','12345678',true,'Not enough privacy.',{requestId,revision:0})).status,200);
  assert.equal((await vote('peter','12345678',true,'Not enough privacy.',{requestId,revision:0})).body.repeated,true);
  assert.equal((await vote('rebecka','12345678',true,'Not enough privacy.',{requestId,revision:0})).status,409);
  assert.equal((await queue()).length,0);
  const view=(await clients.rebecka.get('/api/references/12345678')).body.home.review;
  assert.equal(view.decisions.find(v=>v.id==='peter').rejected,true); assert.equal(view.decisions.find(v=>v.id==='rebecka').rejected,false);
  const property=(await clients.peter.get('/api/properties/MR001')).body.property;
  assert.equal(property.rank,null); assert.equal(property.pool,'excluded');
  assert.equal(property.referenceRejected,true); assert.equal(property.jointlyRejected,false);
});
test('joint rejection queues once, excludes a verified linked dossier, survives imports and supports undo', async () => {
  assert.equal((await vote('rebecka','12345678',true,'Layout is wrong.')).status,200);
  const q=await queue(); assert.equal(q.length,1); assert.equal(q[0].state,'pending'); assert.equal(q[0].eligible,true);
  assert.equal(q[0].listingUrl,'https://www.idealista.it/immobile/12345678/');
  let p=(await clients.peter.get('/api/properties/MR001')).body.property; assert.equal(p.rank,null); assert.equal(p.jointlyRejected,true); assert.equal(p.status,'Open');
  await operator('/api/import/references',{...importBundle,sourceRevision:'joint-refresh',expectedRevision:'joint-initial',homes:importBundle.homes.map(h=>({...h,price:250000}))}).expect(200);
  assert.equal((await queue()).length,1); assert.equal((await clients.peter.get('/api/references/12345678')).body.home.review.bothRejected,true);
  assert.equal((await vote('peter','12345678',false)).status,200);
  assert.equal((await queue())[0].state,'cancelled'); assert.equal((await queue())[0].eligible,false);
  p=(await clients.peter.get('/api/properties/MR001')).body.property;
  assert.equal(p.rank,null); assert.equal(p.referenceRejected,true); assert.equal(p.jointlyRejected,false);
  assert.equal((await vote('rebecka','12345678',false)).status,200);
  p=(await clients.peter.get('/api/properties/MR001')).body.property;
  assert.equal(p.rank,1); assert.equal(p.referenceRejected,false);
  await operator(`/api/removal-emails/${q[0].id}/claim`,{claimId:randomUUID()}).expect(409);
  assert.equal((await vote('peter','12345678',true)).status,200);
  assert.equal((await queue())[0].id,q[0].id); assert.equal((await queue())[0].state,'cancelled');
  assert.equal((await vote('rebecka','12345678',true)).status,200);
  assert.equal((await queue())[0].state,'pending');
});
test('delivery claims prevent duplicate workers; uncertain sends are held; confirmed receipts are idempotent', async () => {
  const e=(await queue())[0], claimId=randomUUID();
  await operator(`/api/removal-emails/${e.id}/claim`,{claimId}).expect(200);
  await operator(`/api/removal-emails/${e.id}/claim`,{claimId:randomUUID()}).expect(409);
  assert.equal((await operator(`/api/removal-emails/${e.id}/claim`,{claimId}).expect(200)).body.repeated,true);
  await operator(`/api/removal-emails/${e.id}/failure`,{claimId,outcome:'unknown',error:'Delivery receipt was interrupted.'}).expect(200);
  assert.equal((await queue())[0].state,'needs_check');
  await operator(`/api/removal-emails/${e.id}/claim`,{claimId:randomUUID()}).expect(409);
  await operator(`/api/removal-emails/${e.id}/complete`,{claimId:randomUUID(),messageId:'confirmed-test-receipt'}).expect(409);
  for(let i=0;i<2;i++) await operator(`/api/removal-emails/${e.id}/complete`,{claimId,messageId:'confirmed-test-receipt'}).expect(200);
  assert.equal((await queue())[0].state,'sent');
  await vote('peter','12345678',false); await vote('peter','12345678',true);
  assert.equal((await queue()).length,1); assert.equal((await queue())[0].state,'sent');
  const exported=(await request(app).get('/api/export').set('Authorization',`Bearer ${secret}`)).body;
  assert.ok(exported.reference_decision_events.length>=6); assert.equal(exported.reference_removal_emails.length,1);
});
test('concurrent personal decisions produce one notification and stale tabs cannot undo newer votes', async () => {
  const votes=await Promise.all([vote('peter','87654321',true),vote('rebecka','87654321',true)]);
  assert.deepEqual(votes.map(r=>r.status),[200,200]); assert.equal((await queue()).filter(e=>e.reference_id==='87654321').length,1);
  assert.equal((await vote('peter','87654321',false,'',{revision:0})).status,409);
  const e=(await queue()).find(e=>e.reference_id==='87654321'), claimId=randomUUID();
  await operator(`/api/removal-emails/${e.id}/claim`,{claimId}).expect(200);
  await operator(`/api/removal-emails/${e.id}/failure`,{claimId,outcome:'failed',error:'Gmail definitively rejected the request without sending.'}).expect(200);
  assert.equal((await queue()).find(x=>x.id===e.id).state,'pending');
  await vote('rebecka','87654321',false);
  await operator(`/api/removal-emails/${e.id}/claim`,{claimId:randomUUID()}).expect(409);
});

test('a complete shared-list removal excludes a verified linked dossier and re-addition clears only that gate', async () => {
  await operator('/api/import/references',{...importBundle,sourceRevision:'membership-without-linked',expectedRevision:'joint-refresh',homes:[listing('87654321')]}).expect(200);
  let p=(await clients.peter.get('/api/properties/MR001')).body.property;
  assert.equal(p.rank,null); assert.equal(p.pool,'excluded'); assert.equal(p.referenceRemoved,true);
  await operator('/api/import/references',{...importBundle,sourceRevision:'membership-restored',expectedRevision:'membership-without-linked'}).expect(200);
  p=(await clients.peter.get('/api/properties/MR001')).body.property;
  assert.equal(p.referenceRemoved,false);
  assert.equal(p.rank,null); // Existing personal rejections still apply independently.
});

