import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { openDossier } from './support/dossier-page.js';

test('asset inventory requires operator authorization and excludes private history', async () => {
  const data = { name:'Home', price:180000, score:null, region:'Piemonte', province:'AL', source:'https://example.com/old', photos:[{url:'https://example.com/photo.jpg'}], comment:'private comment', password:'never expose' };
  const db = { query: async sql => ({ rows: sql.includes('SELECT id,data') ? [{ id:'PM001', data }] : [{ property_id:'PM001', image_index:0, mime_type:'image/jpeg', byte_length:1000, content_hash:'test-hash' }] }) };
  const secret='test-asset-audit-operator-token-at-least-32';
  const app=createApp({db,importToken:secret});
  await request(app).get('/api/import/asset-audit').expect(401);
  const r=await request(app).get('/api/import/asset-audit').set('Authorization',`Bearer ${secret}`).expect(200);
  assert.equal(r.body.properties[0].photos.length,1);
  assert.equal(r.body.media[0].byte_length,1000);
  assert.equal(r.body.properties[0].comment,undefined);
  assert.equal(r.body.properties[0].password,undefined);
});

test('dossier prominently opens the verified alternate advert and retains the original source', async () => {
  const old='https://example.com/original', preferred='https://example.com/verified-alternative';
  const p={id:'PM001',name:'Home',price:180000,score:null,pool:'verify',status:'Open',region:'Piemonte',province:'AL',photos:[],dossier:[],source:old,preferredListingUrl:preferred,sources:[{url:old,portal:'Original source'}]};
  const {html}=await openDossier(p);
  assert.match(html,/Open property advert/);
  assert.ok(html.indexOf(preferred)<html.indexOf('id="feedback"'));
  assert.ok(html.includes(old));
});

test('a saved listing thumbnail remains visible while the full gallery is pending', async () => {
  const p={id:'IL12345678',name:'Pending home',price:180000,score:null,pool:'verify',status:'Open',region:'Marche',province:'MC',photos:[],dossier:[],sources:[],source:'https://www.idealista.it/immobile/12345678/',referencePhoto:{url:'https://img4.idealista.it/example.jpg',alt:'Saved property exterior'}};
  const {html}=await openDossier(p);
  assert.match(html,/src="https:\/\/img4.idealista.it\/example.jpg"/);
  assert.match(html,/Saved listing thumbnail/);
  assert.doesNotMatch(html,/Listing photographs are currently unavailable/);
});
