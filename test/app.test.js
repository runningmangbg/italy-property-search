import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';

const secret = 'test-import-authorization-token-long-enough';
let pg, db, app, alice, bob, csrfA, csrfB;
const manifest = (revision, price=198000) => ({ sourceRevision:revision, observedAt:'2026-09-26T19:19:16Z', properties:[
  { id:'AB001', name:'Test farmhouse', region:'Abruzzo', province:'TE', price, score:72, sources:[{url:'https://example.com/a',observed_price:198000}] },
  { id:'MR001', name:'Test price watch', region:'Marche', province:'AN', price:280000, score:80 },
] });
before(async () => {
  pg=new PGlite(); await pg.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
  db={query:(...args)=>pg.query(...args),transaction:fn=>pg.transaction(fn)};
  app=createApp({db,importToken:secret,users:[{id:'alice',name:'Alice',passwordHash:hashPassword('Alice-test-password')},{id:'bob',name:'Bob',passwordHash:hashPassword('Bob-test-password')}]});
  alice=request.agent(app); bob=request.agent(app);
  csrfA=(await alice.post('/api/login').send({username:'alice',password:'Alice-test-password'})).body.csrf;
  csrfB=(await bob.post('/api/login').send({username:'bob',password:'Bob-test-password'})).body.csrf;
});
after(async()=>pg.close());

test('private data and imports require the correct authentication; CSRF blocks writes',async()=>{
  await request(app).get('/api/properties').expect(401);
  await request(app).get('/api/media/AB001/0').expect(401);
  await request(app).post('/api/import').send(manifest('bad')).expect(401);
  await alice.post('/api/properties/AB001/feedback').send({}).expect(403);
  await alice.get('/private/access.json').expect(404);
});
test('imports preserve IDs, watch separation, revisions, and shared decisions',async()=>{
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(manifest('first')).expect(200);
  const repeat=await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(manifest('first')).expect(200);
  assert.equal(repeat.body.repeated,true);
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(manifest('first',180000)).expect(409);
  let properties=(await alice.get('/api/properties')).body.properties;
  assert.equal(properties.find(p=>p.id==='MR001').rank,null);
  assert.equal(properties.find(p=>p.id==='AB001').rank,1);
  const requestId=randomUUID();
  const decision={requestId,revision:0,status:'Closed',favourite:true,comment:'Owner space is too small.'};
  await alice.post('/api/properties/AB001/feedback').set('X-CSRF-Token',csrfA).send(decision).expect(200);
  await alice.post('/api/properties/AB001/feedback').set('X-CSRF-Token',csrfA).send(decision).expect(200);
  await bob.post('/api/properties/AB001/feedback').set('X-CSRF-Token',csrfB).send({...decision,requestId:randomUUID(),status:'Interested'}).expect(409);
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(manifest('price-drop',175000)).expect(200);
  const detail=(await bob.get('/api/properties/AB001')).body;
  assert.equal(detail.property.status,'Closed'); assert.equal(detail.property.rank,null); assert.equal(detail.property.favourite,true);
  assert.equal(detail.events.length,1); assert.equal(detail.events[0].comment,decision.comment);
  assert.equal(detail.snapshots.length,2); assert.equal(detail.property.price,175000);
  await bob.post('/api/properties/AB001/feedback').set('X-CSRF-Token',csrfB).send({requestId:randomUUID(),revision:1,status:'Open',favourite:true,comment:'Reopened together.'}).expect(200);
  assert.equal((await alice.get('/api/properties/AB001')).body.property.rank,1);
});
test('concurrent writers cannot overwrite each other and failed batches are atomic',async()=>{
  const body={revision:2,status:'On hold',favourite:true,comment:'Check the annex.'};
  const responses=await Promise.all([alice.post('/api/properties/AB001/feedback').set('X-CSRF-Token',csrfA).send({...body,requestId:randomUUID()}),bob.post('/api/properties/AB001/feedback').set('X-CSRF-Token',csrfB).send({...body,requestId:randomUUID()})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const dup=manifest('duplicate'); dup.properties.push(dup.properties[0]);
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(dup).expect(400);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM import_runs')).rows[0].n,2);
});
test('imports cannot reopen held property, remove missing properties, or overwrite comments',async()=>{
  const update=manifest('sparse',160000);update.properties.pop();update.properties[0].status='Open';update.properties[0].sources=[];
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(update).expect(200);
  const d=(await alice.get('/api/properties/AB001')).body;
  assert.equal(d.property.pool,'hold');assert.equal(d.property.rank,null);assert.equal(d.property.sources.length,1);assert.equal(d.events.length,3);
  assert.equal((await alice.get('/api/properties')).body.properties.length,2);
});
test('media validates content and logout invalidates the server-side session',async()=>{
  await request(app).put('/api/import/media/AB001/0').set('Authorization',`Bearer ${secret}`).set('Content-Type','image/jpeg').send(Buffer.from('<script>')).expect(400);
  await alice.post('/api/logout').set('X-CSRF-Token',csrfA).expect(200);
  await alice.get('/api/properties').expect(401);
});
