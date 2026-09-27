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

test('Dolomiti dossiers support imports, photos, reference links, routes and preserved decisions',async()=>{
  const property={id:'DL001',name:'Mountain home',region:'Dolomiti',province:'Belluno',administrativeRegion:'Veneto',price:200000,score:70};
  const payload={sourceRevision:'dolomiti-first',observedAt:'2026-09-27T15:00:00Z',properties:[property]};
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(payload).expect(200);
  const detail=(await bob.get('/api/properties/DL001').expect(200)).body.property;
  assert.equal(detail.region,'Dolomiti'); assert.equal(detail.administrativeRegion,'Veneto');
  await bob.get('/properties/DL001').expect(200).expect('Content-Type',/html/);
  await bob.get('/DL001.html').expect(200).expect('Content-Type',/html/);
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await request(app).put('/api/import/media/DL001/0').set('Authorization',`Bearer ${secret}`).set('Content-Type','image/png').send(image).expect(200);
  await bob.get('/api/media/DL001/0').expect(200).expect('Content-Type',/image\/png/);
  await request(app).post('/api/import/references').set('Authorization',`Bearer ${secret}`).send({sourceRevision:'dolomiti-reference',expectedRevision:null,observedAt:payload.observedAt,listName:'Examples',sourceUrl:'https://www.idealista.it/fav-list/1?share=example',homes:[{id:'12345678',name:property.name,url:'https://www.idealista.it/immobile/12345678/',price:property.price,region:'Veneto',province:'Belluno',position:0,area:'Not verified',land:'Not verified',photo:null,matches:['DL001'],assessment:{verdict:'needs-review',summary:'Check owner access.',positives:[],questions:[],basis:'Listing detail'}}]}).expect(200);
  assert.deepEqual((await bob.get('/api/references/12345678')).body.home.matches,['DL001']);
  await bob.post('/api/properties/DL001/feedback').set('X-CSRF-Token',csrfB).send({requestId:randomUUID(),revision:0,status:'Closed',favourite:false,comment:'Access does not work for us.'}).expect(200);
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send({...payload,sourceRevision:'dolomiti-refresh',properties:[{...property,price:190000}]}).expect(200);
  const refreshed=(await bob.get('/api/properties/DL001')).body;
  assert.equal(refreshed.property.status,'Closed'); assert.equal(refreshed.property.rank,null);
  assert.equal(refreshed.events[0].comment,'Access does not work for us.');
  assert.equal((await bob.get('/api/properties')).body.properties.length,3);
});

test('profile-only imports preserve property evidence, shared decisions and reference metadata',async()=>{
  const read=async()=>Object.fromEntries(await Promise.all(['properties','property_snapshots','decisions','feedback_events','reference_homes','reference_notes'].map(async table=>[table,(await db.query(`SELECT * FROM ${table} ORDER BY 1`)).rows])));
  const before=await read();
  const referenceMeta=(await db.query("SELECT value FROM project_meta WHERE key='idealistaReferences'")).rows[0].value;
  const payload={sourceRevision:'expanded-profile',observedAt:'2026-09-27T16:00:00Z',properties:[],meta:{profile:'Abruzzo, Marche and Dolomiti',idealistaReferences:{sourceRevision:'stale-register-copy'}}};
  const result=await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(payload).expect(200);
  assert.equal(result.body.imported,0);
  assert.deepEqual(await read(),before);
  assert.deepEqual((await db.query("SELECT value FROM project_meta WHERE key='idealistaReferences'")).rows[0].value,referenceMeta);
  assert.equal((await bob.get('/api/properties')).body.meta.profile,payload.meta.profile);
  assert.equal((await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send(payload).expect(200)).body.repeated,true);
  await request(app).post('/api/import').set('Authorization',`Bearer ${secret}`).send({...payload,sourceRevision:'empty',meta:{}}).expect(400);
});
