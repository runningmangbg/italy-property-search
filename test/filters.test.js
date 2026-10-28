import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { openDossier } from './support/dossier-page.js';

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

const agencySample = sample.map(p => ({ ...p, agencies: ['AB001', 'AB003', 'AB004', 'MR001'].includes(p.id)
  ? [{ id: 'monica-bruni-real-estate', name: 'Monica Bruni Real Estate' }, ...(p.id === 'AB001' ? [{ id: 'immobiliare-puzielli', name: 'Immobiliare Puzielli' }] : [])]
  : [] }));

test('unverified adverts have their own queue and cannot enter active rankings or price watch', async () => {
  const p=[home('AB001','ranked',{rank:1}),home('AB002','unverified',{score:95,rank:null}),home('AB003','unverified',{status:'Interested'})];
  const page=await filterPage(p);
  assert.deepEqual(page.ids(),['AB001']);
  await page.view('active'); assert.deepEqual(page.ids(),['AB001']);
  await page.view('watch'); assert.deepEqual(page.ids(),[]);
  await page.view('unverified'); assert.deepEqual(page.ids(),['AB002']);
  assert.match(page.node('#collection-content').innerHTML,/not a sold status/);
  await page.view('interested'); assert.deepEqual(page.ids(),['AB003']);
});

test('an expired Idealista invitation clearly labels the retained snapshot without inventing removals', async () => {
  const page=await filterPage(sample,'/?source=idealista',{idealistaListAccess:{status:'blocked'}});
  assert.match(page.node('#collection-content').innerHTML,/last complete snapshot/);
  assert.match(page.node('#collection-content').innerHTML,/latest removals have not been applied/);
  assert.ok(page.ids().includes('AB001'));
});

test('region filters retain complete province labels and private-seller information', async () => {
  const properties = [home('PM001', 'ranked', { region: 'Piemonte', province: 'TO' }),
    home('DL001', 'ranked', { region: 'Trentino-Alto Adige', province: 'TN', advertiserType: 'private' }),
    home('IL12345678', 'excluded', { region: "Valle d'Aosta", province: 'AO', geographyExcluded: true }),
    home('DL002', 'excluded', { region: 'Veneto', province: 'BL', geographyExcluded: true })];
  const page = await filterPage(properties);
  assert.doesNotMatch(page.node('#collection-content').innerHTML, /<option>Veneto<\/option>/);
  assert.match(page.node('#collection-content').innerHTML, /Torino \(TO\)/);
  assert.doesNotMatch(page.node('#collection-content').innerHTML, /id="agency"/);
  assert.match(page.node('#cards').innerHTML, /Private seller/);
  const archive = await filterPage(properties, '/?view=closed');
  assert.match(archive.node('#collection-content').innerHTML, /Aosta \(AO\)/);
  const legacy = await filterPage(properties, '/?region=Piedmont');
  assert.deepEqual(legacy.ids(), ['PM001']);
});

test('retired agency URL filters are ignored and removed without suppressing homes', async () => {
  for (const agency of ['monica-bruni-real-estate', 'unknown', 'private', '%22%3E%3Cscript%3E']) {
    const page = await filterPage(agencySample, '/?agency=' + agency + '&sort=rank-desc');
    assert.deepEqual(page.ids(), ['AB003', 'AB002', 'AB001']);
    assert.doesNotMatch(page.node('#collection-content').innerHTML, /id="agency"/);
    assert.doesNotMatch(page.location.search, /agency=/);
    assert.match(page.node('#cards').innerHTML, /Monica Bruni Real Estate/);
    assert.match(page.node('#cards').innerHTML, /Agency not recorded/);
    const restored = await filterPage(agencySample, page.location.pathname + page.location.search);
    assert.deepEqual(restored.ids(), page.ids());
  }
});

test('agency information remains escaped even though its filter is removed', async () => {
  const p = home('AB099', 'ranked', { agencies: [{ id: 'safe-id', name: '<img src=x onerror=alert(1)>' }] });
  const page = await filterPage([p]);
  assert.match(page.node('#cards').innerHTML, /&lt;img/);
  assert.doesNotMatch(page.node('#cards').innerHTML, /<img src=x/);
});

test('Major restoration shows only open homes, excluding held and archived homes', async () => {
  const review = { condition: { category: 'major-restoration', scope: 'Ancillary roof only' }, views: { grade: 'excellent' } };
  const properties = sample.map(p => ['AB001', 'AB004', 'AB007', 'AB008'].includes(p.id) ? { ...p, photoReview: review } : p);
  const page = await filterPage(properties, '/?view=restoration');
  assert.deepEqual(page.ids(), ['AB001']);
  assert.equal(page.run('counts().restoration'), 1);
  assert.match(page.node('#cards').innerHTML, /Ancillary roof only/);
  assert.doesNotMatch(page.node('#cards').innerHTML, /Rejected/);
  await page.change('source', 'idealista');
  assert.equal(page.run('state.tab'), 'restoration');
  assert.deepEqual(page.ids(), ['AB001']);
  const restored = await filterPage(properties, page.location.pathname + page.location.search);
  assert.deepEqual(restored.ids(), page.ids());
  await page.view('ranked');
  assert.deepEqual(page.ids(), ['AB001', 'AB003']);
  assert.equal(properties.find(p => p.id === 'AB004').rejected, true);
});

test('dossier explains photo scope, uncertainty, score changes and excluded imagery safely', async () => {
  const p = home('AB001', 'ranked', { photoReview: {
    reviewDate: '2026-10-04', imageCount: 1, confidence: 'low',
    condition: { category: 'major-restoration', scope: 'Annex only', observation: '<script>bad</script>', priorEvidence: 'Full restoration of annex reported.' },
    views: { grade: 'not-assessable', observation: 'AI-labelled image excluded.' },
    scores: { before: { 'Technical /5': 2, 'Outdoor views sun /10': 5 }, after: { 'Technical /5': 1, 'Outdoor views sun /10': 5 }, totalBefore: 70, totalAfter: 69 },
    method: 'Saved images reviewed.', limitations: 'Survey required.', sources: [{ imageIndex: 1, sourceUrl: 'https://example.test/listing', excludedFromScoring: true }],
  } });
  const { html } = await openDossier(p);
  assert.match(html, /Condition & views/);
  assert.match(html, /Annex only/);
  assert.match(html, /Total at review: 70 → 69/);
  assert.match(html, /excluded from scoring/);
  assert.match(html, /\?view=restoration/);
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>bad/);
});

// Execute the shipped scripts and their real event handlers, using a small DOM sink.
export async function filterPage(properties = sample, path = '/', meta = {}) {
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
    fetch: async path => ({ ok: true, json: async () => path === '/api/session' ? { user: { id: 'peter', name: 'Peter' }, csrf: 'test' } : { properties, meta } }),
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


test('Interested view combines filters and persists without restoring excluded homes', async () => {
  const properties = agencySample.map(p => ({ ...p, status: p.id === 'AB002' ? 'Open' : 'Interested' }));
  const page = await filterPage(properties);
  await page.view('interested');
  assert.deepEqual(page.ids(), ['AB001', 'AB003', 'IL32345678', 'MR001']);
  assert.equal(page.run('counts().interested'), 4);
  assert.match(page.node('#main').innerHTML, /data-tab="interested"/);
  await page.change('source', 'idealista');
  assert.equal(page.run('state.tab'), 'interested');
  await page.change('region', 'Abruzzo');
  await page.change('sort', 'rank-desc');
  assert.deepEqual(page.ids(), ['AB003', 'AB001', 'IL32345678']);
  const before = page.location.pathname + page.location.search;
  const reloaded = await filterPage(properties, before);
  assert.deepEqual(reloaded.ids(), page.ids());
  page.location.pathname = '/properties/AB001';
  await page.fire('click', { id: 'back' });
  assert.equal(page.location.pathname + page.location.search, before);
  await page.input('no matching home');
  assert.deepEqual(page.ids(), []);
  await page.fire('click', { id: 'clear-filters' });
  assert.equal(page.location.search, '?view=interested');
  assert.equal(page.ids().length, 4);
});


test('closed homes appear only in Closed & excluded, including after reload and reopening', async () => {
  const closed = home('AB099', 'closed', { status: 'Closed', favourite: true,
    photoReview: { condition: { category: 'major-restoration' } } });
  const page = await filterPage([...sample, closed]);
  for (const tab of ['ranked', 'active', 'restoration', 'verify', 'watch', 'interested', 'favourites', 'hold', 'all']) {
    await page.view(tab);
    assert.ok(!page.ids().includes('AB099'), tab);
    assert.equal(page.run(`counts()[${JSON.stringify(tab)}]`), page.ids().length);
  }
  await page.view('closed');
  assert.ok(page.ids().includes('AB099'));
  const restored = await filterPage([...sample, closed], '/?view=all');
  assert.ok(!restored.ids().includes('AB099'));
  page.run("state.compare.add('AB099')");
  await page.view('compare');
  assert.equal(page.run("state.compare.has('AB099')"), false);
  assert.doesNotMatch(page.node('#collection-content').innerHTML, /Home AB099/);
  page.run("state.properties.find(p => p.id === 'AB099').status = 'Interested'; state.properties.find(p => p.id === 'AB099').pool = 'ranked'");
  await page.view('interested');
  assert.ok(page.ids().includes('AB099'));
  await page.view('closed');
  assert.ok(!page.ids().includes('AB099'));
});

test('reviewed statuses leave every browsing queue while scores, ranks and status views remain intact', async () => {
  const review = { condition: { category: 'major-restoration' } };
  const properties = [];
  for (const pool of ['ranked', 'watch', 'verify']) {
    for (const status of ['Open', 'Interested', 'On hold', 'Closed']) {
      properties.push(home(`${pool}-${status}`, pool, { status, rank: pool === 'ranked' ? properties.length + 1 : null,
        favourite: true, referenceIds: ['12345678'], agencies: [{ id: 'test-agent', name: 'Test Agent' }], photoReview: review }));
    }
  }
  const before = JSON.stringify(properties);
  const page = await filterPage(properties);
  for (const tab of ['ranked', 'active', 'watch', 'verify', 'restoration', 'favourites', 'all']) {
    await page.view(tab);
    assert.ok(page.ids().length > 0, tab);
    assert.ok(page.ids().every(id => id.endsWith('-Open')), tab);
    assert.equal(page.run(`counts()[${JSON.stringify(tab)}]`), page.ids().length);
  }
  for (const [tab, status] of [['interested', 'Interested'], ['hold', 'On hold'], ['closed', 'Closed']]) {
    await page.view(tab);
    await page.change('source', 'idealista');
    assert.equal(page.run('state.tab'), tab);
    assert.equal(page.ids().length, 3);
    assert.ok(page.ids().every(id => id.endsWith('-' + status)));
    const reloaded = await filterPage(properties, page.location.pathname + page.location.search);
    assert.deepEqual(reloaded.ids(), page.ids());
  }
  assert.equal(JSON.stringify(properties), before);
  for (const pool of ['ranked', 'watch', 'verify']) {
    page.run(`state.properties.find(p => p.id === '${pool}-Interested').status = 'Open'`);
    await page.view(pool);
    assert.ok(page.ids().includes(`${pool}-Interested`));
  }
  assert.equal(properties.find(p => p.id === 'ranked-Interested').rank, 2);
  assert.equal(properties.find(p => p.id === 'ranked-Interested').score, 70);
});
