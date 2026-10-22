import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { listingDay, listingHistory } from '../server/listing-age.js';
import { collectionRows } from '../server/collection.js';
import { openDossier } from './support/dossier-page.js';
import { PGlite } from '@electric-sql/pglite';
import { allProperties, importProperties } from '../server/domain.js';

test('later imports preserve discovery dates and legacy snapshot evidence reaches the list API', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
    const db = { query: (...args) => pg.query(...args), transaction: fn => pg.transaction(fn) };
    const p = { id: 'MR001', name: 'Home', region: 'Marche', province: 'PU', price: 190000, score: 70 };
    await importProperties(db, { sourceRevision: 'initial', observedAt: '2026-03-01T12:00:00Z', properties: [p] });
    await importProperties(db, { sourceRevision: 'refresh', observedAt: '2026-09-01T12:00:00Z', properties: [{ ...p, firstSeenAt: '2026-09-01' }] });
    assert.equal((await allProperties(db))[0].firstSeenAt, '2026-03-01');
    await pg.query("UPDATE properties SET data=data-'firstSeenAt'");
    const legacy = (await allProperties(db))[0];
    assert.equal(legacy.listingHistory.since, '2026-03-01');
    assert.equal(legacy.listingHistory.basis, 'first-seen');
  } finally { await pg.close(); }
});

test('publication evidence, first sightings and unknown ages stay distinct', () => {
  const published = listingHistory([{ data: { source: 'https://example.test/a', sources: [{ published_at: '2026-02-01', first_seen: '2026-09-19' }] } }]);
  assert.equal(published.basis, 'published');
  assert.equal(published.since, '2026-02-01');
  const seen = listingHistory([{ data: { sources: [{ first_seen: '2026-09-19' }], checked: '2026-10-20' }, imported_at: '2026-10-21' }]);
  assert.equal(seen.basis, 'first-seen');
  assert.equal(seen.since, '2026-09-19');
  assert.equal(listingHistory([{ data: { checked: '2026-10-20' }, imported_at: '2026-10-21' }]).basis, 'unknown');
  assert.equal(listingDay('2026-02-30'), null);
  assert.equal(listingDay('2099-01-01'), null);
  assert.equal(listingDay('Updated yesterday'), null);
  assert.equal(listingDay('2024-02-29'), '2024-02-29');
});

test('linked adverts and relistings retain the earliest sighting as a lower bound', () => {
  const rows = collectionRows([
    { id: 'MR001', data: { id: 'MR001', source: 'https://www.idealista.it/immobile/12345678/', sources: [{ first_seen: '2026-03-01' }] } },
  ], [{ id: '12345678', data: { id: '12345678', publishedAt: '2026-09-01', matches: [], url: 'https://www.idealista.it/immobile/12345678/' }, first_observed_at: new Date('2026-09-27T12:00:00Z') }], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data.listingHistory.since, '2026-03-01');
  assert.equal(rows[0].data.listingHistory.basis, 'first-seen');
  assert.equal(rows[0].data.listingHistory.publishedAt, '2026-09-01');
  const reference = collectionRows([], [{ id: '22345678', data: { id: '22345678', name: 'Saved home', assessment: { summary: '' }, matches: [] }, first_observed_at: '2026-09-27T12:00:00Z' }], [])[0];
  assert.equal(reference.data.listingHistory.since, '2026-09-27');
});

test('the actual card and dossier render age with the right qualification', async () => {
  const p = { id: 'MR001', name: 'Home', region: 'Marche', province: 'PU', price: 190000, score: 70, status: 'Open', pool: 'ranked', photos: [], dossier: [], sources: [], listingHistory: { since: '2026-03-01', basis: 'first-seen', sourceUrl: 'https://example.test/a' } };
  const { html } = await openDossier(p);
  assert.match(html, /Seen for at least [\d,]+ days/);
  assert.match(html, /Original publication date unknown/);
  assert.match(html, /does not confirm continuous availability/);
  const context = vm.createContext({ URL, URLSearchParams, Intl, setTimeout, document: { querySelector: () => ({ innerHTML: '' }), addEventListener() {} }, window: { addEventListener() {} }, location: { pathname: '/', search: '' }, fetch: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  await vm.runInContext(await readFile(new URL('../public/app.js', import.meta.url), 'utf8'), context);
  context.property = p;
  assert.match(vm.runInContext('card(property)', context), /Seen for at least/);
  p.listingHistory.basis = 'published';
  assert.match(vm.runInContext('card(property)', context), /Advert published [\d,]+ days ago/);
  p.listingHistory = null;
  assert.match(vm.runInContext('card(property)', context), /Advert age unknown/);
});
