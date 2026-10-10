import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionRows } from '../server/collection.js';
import { rank } from '../server/domain.js';

const ref = (id, extra = {}, listed = true) => ({ id, listed, data: {
  id, name: 'Saved house', url: `https://www.idealista.it/immobile/${id}/`, price: 180000,
  region: 'Marche', province: 'Fermo', area: '300 m²', land: 'Garden', matches: [],
  assessment: { summary: 'Owner layout needs assessment.' }, ...extra,
} });
const home = (id = 'MR001', data = {}, row = {}) => ({ id, data: {
  id, name: 'Assessed house', price: 180000, score: 72, region: 'Marche', province: 'Fermo',
  source: 'https://www.idealista.it/immobile/12345678/', ...data,
}, ...row });
const collection = (p, r, v = []) => rank(collectionRows(p, r, v));

test('a saved advert and its verified duplicate share one existing ranked dossier', () => {
  const p = collection([home()], [ref('12345678'), ref('22345678', { duplicateOf: '12345678' })]);
  assert.equal(p.length, 1);
  assert.equal(p[0].id, 'MR001');
  assert.equal(p[0].score, 72);
  assert.equal(p[0].rank, 1);
  assert.deepEqual(p[0].referenceIds, ['12345678', '22345678']);
});

test('either rejection excludes every linked advert; another remaining rejection prevents restoration', () => {
  const refs = [ref('12345678'), ref('22345678', { duplicateOf: '12345678' })];
  const votes = [{ reference_id: '22345678', user_id: 'rebecka', rejected: true }];
  let p = collection([home()], refs, votes)[0];
  assert.equal(p.pool, 'excluded'); assert.equal(p.rank, null); assert.equal(p.rejected, true);
  assert.equal(p.jointlyRejected, false);
  p = collection([home()], refs, [...votes, { reference_id: '12345678', user_id: 'peter', rejected: false }])[0];
  assert.equal(p.rank, null);
  assert.equal(collection([home()], refs, [{ ...votes[0], rejected: false }])[0].rank, 1);
});

test('a missing saved advert drops its physical property even when another alias remains listed', () => {
  const refs = [ref('12345678', {}, false), ref('22345678', { duplicateOf: '12345678' })];
  const p = collection([home()], refs)[0];
  assert.equal(p.pool, 'excluded'); assert.equal(p.rank, null); assert.equal(p.removedFromSharedList, true);
  refs[0].listed = true;
  assert.equal(collection([home()], refs)[0].rank, 1);
  assert.equal(collection([home('MR001', {}, { status: 'Closed' })], refs)[0].rank, null);
});

test('new references are visible without invented scores; an assessed IL dossier joins the same rankings', () => {
  const refs = [ref('12345678'), ref('22345678', { region: 'Piemonte' })];
  let p = collection([home()], refs);
  assert.equal(p.length, 2);
  const pending = p.find(p => p.id === 'IL22345678');
  assert.equal(pending.score, null); assert.equal(pending.rank, null); assert.equal(pending.pool, 'verify');
  p = collection([home(), home('IL22345678', { source: refs[1].data.url, region: 'Piemonte', score: 76 })], refs);
  assert.equal(p.length, 2); assert.equal(p[0].id, 'IL22345678'); assert.equal(p[0].rank, 1);
  assert.equal(p[1].rank, 2);
});

test('unavailable adverts are excluded but an unverified alternative is not treated as unavailable', () => {
  const refs = [ref('12345678', { availability: 'withdrawn' }), ref('22345678', { duplicateOf: '12345678', availability: 'unknown' })];
  let p = collection([], refs)[0];
  assert.equal(p.pool, 'verify'); assert.equal(p.availability, 'unknown');
  refs[1].data.availability = 'removed';
  assert.equal(collection([], refs)[0].pool, 'inactive');
  assert.equal(collection([home('MR001', { availability: 'sold' })], [ref('12345678')])[0].pool, 'inactive');
  assert.equal(collection([home('MR001', { availability: 'unknown' })], [ref('12345678')])[0].rank, 1);
});

test('over-ceiling references remain on price watch even before detailed scoring', () => {
  assert.equal(collection([], [ref('12345678', { price: 280000 })])[0].pool, 'watch');
});

test('similar names are not sufficient evidence of duplication', () => {
  assert.equal(collection([], [ref('12345678'), ref('22345678')]).length, 2);
});

test('agency filtering data combines verified aliases, groups references, and preserves original sources', () => {
  const properties = [home('MR001', { sources: [
    { agent: 'Monica Bruni · A1143' }, { agent: 'Monica Bruni Real Estate · A2858' },
    { agent: 'See original advert' }, { agent: 'Idealista professional advertiser — name not captured' },
  ] }), home('MR002', { source: 'https://www.idealista.it/immobile/22345678/', sources: [
    { agent: 'Puzielli · PU017' }, { agent: 'Puzielli · PU144' },
  ] })];
  const original = JSON.stringify(properties);
  const result = collection(properties, [ref('12345678', { matches: ['MR001', 'MR002'] })]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].agencies, [
    { id: 'immobiliare-puzielli', name: 'Immobiliare Puzielli' },
    { id: 'monica-bruni-real-estate', name: 'Monica Bruni Real Estate' },
  ]);
  assert.equal(JSON.stringify(properties), original);
  const distinct = collection([home('MR003', { sources: [
    { agent: 'MajellaCase · 1074 AB SCA' }, { agent: 'Majellacase · 1321' }, { agent: 'Majella Immobiliare' },
    { agent: 'RE/MAX Centro Casa · 34681015-248' }, { agent: 'RE/MAX People Lanciano' },
  ] })], [])[0];
  assert.deepEqual(distinct.agencies.map(a => a.name), ['Majella Immobiliare', 'Majellacase', 'RE/MAX Centro Casa', 'RE/MAX People Lanciano']);
  assert.deepEqual(collection([], [ref('32345678')])[0].agencies, []);
  assert.deepEqual(collection([home('MR004', { source: 'https://www.idealista.it/immobile/42345678/', sources: [{ agent: 'Advertiser in Casa.it listing' }, { agent: 'https://www.idealista.it/' }] })], [])[0].agencies, []);
});
