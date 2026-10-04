import test from 'node:test';
import assert from 'node:assert/strict';
import { rank } from '../server/domain.js';
import { openDossier } from './support/dossier-page.js';

test('View dossier opens spreadsheet-format evidence with its text, labels and sources', async () => {
  const [property] = rank([{ data: {
    id: 'DL001', name: 'Example mountain home', region: 'Dolomiti', province: 'Belluno', price: 160000, score: 73,
    dossier: [
      { 'Assessment topic': 'Listing facts', 'Evidence class': 'CONFIRMED FACT', 'Assessment and next verification': 'Two homes with separate entrances.', Source: 'https://example.com/listing' },
      { 'Assessment topic': 'Owner privacy', 'Evidence class': 'LIKELY/INFERRED', 'Assessment and next verification': 'The second house may provide privacy.' },
      { topic: 'Planning checks', evidence: 'UNKNOWN/NEEDS VERIFICATION', text: 'Pool permission remains unverified.' },
      { topic: 'Access', text: 'Ask about winter road access.' },
    ],
    photos: [{ caption: 'House exterior', source_url: 'https://example.com/listing' }],
  }, status: 'Closed', revision: 3 }]);
  const result = await openDossier(property, { events: [{ actor_name: 'Test user', status: 'Closed', comment: 'Our saved comment.' }] });
  assert.equal(result.pathname, '/properties/DL001');
  assert.ok(result.requests.includes('/api/properties/DL001'));
  assert.doesNotMatch(result.html, /class="error"|undefined/);
  for (const text of ['Listing facts', 'Two homes with separate entrances.', 'CONFIRMED FACT', 'LIKELY/INFERRED', 'UNKNOWN/NEEDS VERIFICATION', 'Ask about winter road access.', 'Our saved comment.', 'id="feedback"', '/api/media/DL001/0']) assert.ok(result.html.includes(text), text);
  assert.match(result.html, /href="https:\/\/example.com\/listing"/);
  assert.match(result.html, /<option selected>Closed<\/option>/);
  assert.equal(property.dossier[3].evidence, 'UNKNOWN/NEEDS VERIFICATION');
});

test('existing app-format dossiers retain their evidence and escape listing text', async () => {
  const row = { topic: 'Listing facts', evidence: 'CONFIRMED FACT', text: 'House <script>unsafe()</script>', source: 'https://example.com/house' };
  const [property] = rank([{ data: { id: 'AB001', name: 'Existing home', price: 190000, dossier: [row] } }]);
  assert.deepEqual(property.dossier, [row]);
  const { html } = await openDossier(property);
  assert.doesNotMatch(html, /class="error"|<script>unsafe/);
  assert.ok(html.includes('House &lt;script&gt;unsafe()&lt;/script&gt;'));
});

test('a saved house dossier exposes its Idealista advert alongside a different primary portal', async () => {
  const [property] = rank([{ data: { id: 'AB099', name: 'Saved home', price: 190000, source: 'https://www.immobiliare.it/annunci/123456789/', referenceIds: ['12345678'] } }]);
  const { html } = await openDossier(property);
  assert.match(html, /href="https:\/\/www.idealista.it\/immobile\/12345678\/" target="_blank" rel="noopener noreferrer">Open on Idealista/);
  assert.match(html, /href="https:\/\/www.immobiliare.it\/annunci\/123456789\/"/);
});
