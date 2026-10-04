import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const home = (id, pool, extra = {}) => ({ id, name: 'Home ' + id, pool, region: 'Abruzzo', province: 'CH', status: 'Open', score: pool === 'verify' ? null : 70, rank: null, price: 180000, photos: [], referenceIds: [], ...extra });
const sample = [
  home('AB001', 'ranked', { rank: 1, referenceIds: ['12345678'], province: 'Chieti' }),
  home('AB002', 'ranked', { rank: 2, name: 'Casa Città', aliasPropertyIds: ['AB098'] }),
  home('AB003', 'ranked', { rank: 8, referenceIds: ['22345678'], favourite: true }),
  home('IL32345678', 'verify', { referenceIds: ['32345678'], referenceOnly: true, price: null }),
  home('MR001', 'watch', { region: 'Marche', province: 'Ancona', price: 280000, referenceIds: ['42345678'] }),
  home('AB004', 'excluded', { rejected: true, referenceIds: ['52345678'], favourite: true }),
  home('AB005', 'excluded', { removedFromSharedList: true, referenceIds: ['62345678'] }),
  home('AB006', 'inactive', { referenceIds: ['72345678'] }),
  home('AB007', 'hold', { referenceIds: ['82345678'] }),
  home('AB008', 'closed', { referenceIds: ['92345678'] }),
];

// Execute the shipped scripts and their real event handlers, using a small DOM sink.
export async function filterPage(properties = sample, path = '/') {
  const nodes = new Map(), listeners = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', value: '', scrollIntoView() {} });
    return nodes.get(selector);
  };
  const location = new URL(path, 'https://example.test');
  const updateUrl = (_state, _title, path) => { location.href = new URL(path, location).href; };
  const context = vm.createContext({
    URL, URLSearchParams, Intl, setTimeout,
    document: { querySelector: node, querySelectorAll: () => [], addEventListener: (name, handler) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(handler); } },
    window: { addEventListener() {}, scrollTo() {} }, location,
    history: { pushState: updateUrl, replaceState: updateUrl },
    fetch: async path => ({ ok: true, json: async () => path === '/api/session' ? { user: { id: 'peter', name: 'Peter' }, csrf: 'test' } : { properties, meta: {} } }),
  });
  const run = code => vm.runInContext(code, context);
  await run(await readFile(new URL('../public/references.js', import.meta.url), 'utf8'));
  await run(await readFile(new URL('../public/app.js', import.meta.url), 'utf8'));
  const fire = async (event, target) => { target.dataset ||= {}; target.hasAttribute ||= () => false; target.classList ||= { contains: () => false }; for (const handler of listeners.get(event) || []) await handler({ target: { ...target, closest: () => target }, preventDefault() {} }); };
  return { run, node, location, fire,
    ids: () => JSON.parse(run('JSON.stringify(matches().map(p => p.id))')),
    change: (id, value) => fire('change', { id, value }),
    input: value => fire('input', { id: 'search', value }),
    view: tab => fire('click', { dataset: { tab } }),
  };
}

test('lowest-ranked sorting reverses global ranks, keeps unranked homes last, and survives reload', async () => {
  const page = await filterPage();
  await page.change('sort', 'rank-desc');
  assert.deepEqual(page.ids(), ['AB003', 'AB002', 'AB001']);
  await page.change('source', 'idealista');
  assert.deepEqual(page.ids(), ['AB003', 'AB001', 'IL32345678', 'MR001']);
  assert.equal(page.run('state.page'), 1);
  const restored = await filterPage(sample, page.location.pathname + page.location.search);
  assert.equal(restored.run('state.sort'), 'rank-desc');
  assert.deepEqual(restored.ids(), page.ids());
  await page.change('sort', 'rank');
  assert.deepEqual(page.ids(), ['AB001', 'AB003', 'IL32345678', 'MR001']);
});

test('My Idealista list includes pending and price-watch homes, excluding all inactive decisions', async () => {
  const page = await filterPage();
  assert.deepEqual(page.ids(), ['AB001', 'AB002', 'AB003']);
  await page.change('source', 'idealista');
  assert.equal(page.run('state.tab'), 'active');
  assert.deepEqual(page.ids(), ['AB001', 'AB003', 'IL32345678', 'MR001']);
  assert.match(page.node('#filter-context').innerHTML, /4 active homes/);
  assert.match(page.node('#filter-context').innerHTML, /data-tab="verify">1 awaiting evaluation/);
  assert.match(page.node('#result-count').textContent, /4 homes in Active homes/);
  await page.view('ranked');
  assert.deepEqual(page.ids(), ['AB001', 'AB003']);
  assert.match(page.node('#cards').innerHTML, /#8/); // Keep global ranks.
  await page.view('verify');
  assert.deepEqual(page.ids(), ['IL32345678']);
  assert.equal(page.run('matches()[0].score'), null); // No invented rank or score.
});

test('excluded and on-hold saved homes remain available only through explicit history views', async () => {
  const page = await filterPage();
  await page.change('source', 'idealista');
  await page.view('closed');
  assert.deepEqual(page.ids(), ['AB004', 'AB005', 'AB006', 'AB008']);
  await page.view('hold');
  assert.deepEqual(page.ids(), ['AB007']);
  await page.view('favourites');
  assert.deepEqual(page.ids(), ['AB003']);
});

test('province names and codes match together and region changes clear an incompatible province', async () => {
  const page = await filterPage();
  await page.change('source', 'idealista');
  await page.change('province', 'CH');
  assert.deepEqual(page.ids(), ['AB001', 'AB003', 'IL32345678']);
  await page.change('province', 'Chieti');
  assert.deepEqual(page.ids(), ['AB001', 'AB003', 'IL32345678']);
  await page.change('region', 'Marche');
  assert.equal(page.run('state.province'), '');
  assert.deepEqual(page.ids(), ['MR001']);
  assert.match(page.node('#collection-content').innerHTML, /value="AN">Ancona \(AN\)/);
  assert.doesNotMatch(page.node('#collection-content').innerHTML, /value="CH"/);
});

test('search accepts advert IDs, alias IDs, accents and surrounding spaces', async () => {
  const page = await filterPage();
  await page.input('  12345678  ');
  assert.deepEqual(page.ids(), ['AB001']);
  await page.input('AB098');
  assert.deepEqual(page.ids(), ['AB002']);
  await page.input('citta');
  assert.deepEqual(page.ids(), ['AB002']);
  await page.input('Chieti');
  assert.deepEqual(page.ids(), ['AB001', 'AB002', 'AB003']);
});

test('sort, filters and page survive reloads and returning from a dossier', async () => {
  const page = await filterPage([...sample, home('IL10345678', 'verify', { referenceIds: ['10345678'] })]);
  await page.change('source', 'idealista');
  await page.fire('click', { dataset: { page: '2' } });
  assert.match(page.node('#result-count').textContent, /5–5/);
  const before = page.location.pathname + page.location.search;
  const reloaded = await filterPage([...sample, home('IL10345678', 'verify', { referenceIds: ['10345678'] })], before);
  assert.equal(reloaded.run('state.page'), 2);
  assert.deepEqual(reloaded.ids(), page.ids());
  page.location.pathname = '/properties/AB001';
  await page.fire('click', { id: 'back' });
  assert.equal(page.location.pathname + page.location.search, before);
  await page.change('sort', 'price');
  assert.equal(page.run('state.page'), 1);
  assert.equal(page.ids().at(-1), 'IL32345678'); // Unknown prices follow known prices.
});

test('province and source filters survive a direct URL and reset clears them', async () => {
  const page = await filterPage(sample, '/?view=active&source=idealista&region=Abruzzo&province=CH&sort=price&q=AB003');
  assert.deepEqual(page.ids(), ['AB003']);
  assert.match(page.node('#collection-content').innerHTML, /value="CH" selected/);
  await page.fire('click', { id: 'clear-filters' });
  assert.equal(page.location.search, '?view=active');
  assert.deepEqual(page.ids(), ['AB001', 'AB002', 'AB003', 'IL32345678', 'MR001']);
});

test('legacy saved-list links open the same active collection with exclusions respected', async () => {
  const page = await filterPage(sample, '/references');
  // The route starts an async refresh; await it without a time-based delay.
  await page.run('showReferences()');
  assert.equal(page.location.search, '?view=active&source=idealista');
  assert.deepEqual(page.ids(), ['AB001', 'AB003', 'IL32345678', 'MR001']);
});

test('paging is available above the first card and reveals the remaining saved homes', async () => {
  const extra = Array.from({ length: 5 }, (_, n) => home('IL1134567' + n, 'verify', { referenceIds: ['1134567' + n] }));
  const page = await filterPage([...sample, ...extra]);
  await page.change('source', 'idealista');
  const html = page.node('#collection-content').innerHTML;
  assert.ok(html.indexOf('id="pagination-top"') < html.indexOf('id="cards"'));
  assert.match(page.node('#pagination-top').innerHTML, /Page 1 of 3/);
  assert.match(page.node('#pagination-top').innerHTML, /data-page="2" >Next/);
  await page.fire('click', { dataset: { page: '2' } });
  assert.match(page.node('#result-count').textContent, /5–8/);
  for (const p of extra.slice(0, 4)) assert.ok(page.node('#cards').innerHTML.includes(p.id));
  assert.doesNotMatch(page.node('#cards').innerHTML, /Home AB001/);
  assert.equal(page.node('#pagination-top').innerHTML, page.node('#pagination').innerHTML);
  await page.fire('click', { dataset: { page: '3' } });
  assert.match(page.node('#result-count').textContent, /9–9/);
  assert.match(page.node('#pagination-top').innerHTML, /disabled>Next/);
  await page.view('verify');
  assert.equal(page.run('state.source'), 'idealista');
  assert.equal(page.run('state.page'), 1);
  assert.equal(page.ids().length, 6);
});

test('every saved-home card links directly to its Idealista advert, independently of the primary portal', async () => {
  const page = await filterPage();
  for (const pool of ['ranked', 'verify', 'watch', 'hold', 'closed', 'excluded', 'inactive']) {
    const p = home('AB099', pool, { source: 'https://www.immobiliare.it/annunci/123456789/', referenceIds: ['12345678', '22345678', '12345678'] });
    const html = page.run('card(' + JSON.stringify(p) + ')');
    assert.match(html, /href="https:\/\/www.idealista.it\/immobile\/12345678\/" target="_blank" rel="noopener noreferrer">Open on Idealista/);
    assert.equal((html.match(/immobile\/12345678\//g) || []).length, 1);
    assert.match(html, /immobile\/22345678\/.*Alternative Idealista advert 2/);
  }
  assert.equal(page.run('idealistaLinks({referenceIds: []})'), '');
  assert.equal(page.run('idealistaLinks({referenceIds: ["bad-id"]})'), '');
});
