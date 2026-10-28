import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGeography } from '../server/geography.js';
import { rank } from '../server/domain.js';
import { propertyAgencies } from '../server/agencies.js';

test('administrative geography unifies region aliases and full province names without relabelling Belluno as Trento', () => {
  assert.deepEqual(normalizeGeography({ region: 'Piedmont', province: 'Asti' }), { region: 'Piemonte', administrativeRegion: 'Piemonte', province: 'AT' });
  assert.equal(normalizeGeography({ region: 'Piemonte', province: 'Torino' }).province, 'TO');
  assert.equal(normalizeGeography({ region: "Valle d'Aosta", province: 'Aosta' }).province, 'AO');
  const trento = normalizeGeography({ region: 'Dolomiti', province: 'Trento' });
  assert.equal(trento.region, 'Trentino-Alto Adige'); assert.equal(trento.province, 'TN'); assert.equal(trento.searchArea, 'Dolomiti');
  assert.equal(normalizeGeography({ region: 'Dolomiti', province: 'BL' }).region, 'Veneto');
});

test('removed regions cannot rank, while histories, scores and personal status remain intact', () => {
  const rows = [{ id: 'DL001', data: { id: 'DL001', region: 'Dolomiti', province: 'Belluno', price: 180000, score: 90 } },
    { id: 'DL002', data: { id: 'DL002', region: 'Dolomiti', province: 'TN', price: 180000, score: 70 } },
    { id: 'IL12345678', status: 'Closed', data: { id: 'IL12345678', region: "Valle d'Aosta", province: 'Aosta', price: 190000, score: 80 } }];
  const original = JSON.stringify(rows);
  const result = rank(rows);
  const veneto = result.find(p => p.id === 'DL001');
  assert.equal(veneto.pool, 'excluded'); assert.equal(veneto.rank, null); assert.equal(veneto.score, 90);
  assert.equal(result.find(p => p.id === 'DL002').rank, 1);
  assert.equal(result.find(p => p.id === 'IL12345678').pool, 'closed');
  assert.equal(JSON.stringify(rows), original);
});

test('agency identities exclude private advertisers and strip old reference suffixes', () => {
  assert.deepEqual(propertyAgencies([{ agent: 'Private advertiser Example' }]), []);
  assert.deepEqual(propertyAgencies([{ agent: 'Lo Spazio Immobiliare, Asti; ref Rocca' }]), [{ id: 'lo-spazio-immobiliare-asti', name: 'Lo Spazio Immobiliare, Asti' }]);
});
