const main = document.querySelector('#main');
const account = document.querySelector('#account');
const state = { user: null, csrf: '', properties: [], meta: {}, tab: 'ranked', search: '', region: '', province: '', sort: 'rank', source: '', page: 1, compare: new Set(), detail: null, requestId: null };
const activePools = ['ranked', 'watch', 'verify'];
const collectionTabs = ['ranked', 'active', 'verify', 'watch', 'favourites', 'hold', 'closed', 'all', 'weekly'];
const provinceNames = { AQ: "L’Aquila", CH: 'Chieti', PE: 'Pescara', TE: 'Teramo', AN: 'Ancona', AP: 'Ascoli Piceno', FM: 'Fermo', MC: 'Macerata', PU: 'Pesaro e Urbino', BL: 'Belluno', TN: 'Trento', BZ: 'Bolzano', AL: 'Alessandria', AT: 'Asti' };
const searchText = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[’']/g, '').toLowerCase().trim();
function provinceKey(value) {
  const text = searchText(value);
  return Object.entries(provinceNames).find(([code, name]) => text === searchText(code) || text === searchText(name))?.[0] || text;
}
function provinceLabel(value) { const code = provinceKey(value); return provinceNames[code] ? `${provinceNames[code]} (${code})` : value; }
function matchesFilters(p) {
  const text = [p.id, p.name, p.region, p.administrativeRegion, p.province, provinceLabel(p.province), ...(p.referenceIds || []), ...(p.aliasPropertyIds || [])].join(' ');
  return (!state.source || p.referenceIds?.length > 0) && (!state.region || p.region === state.region) && (!state.province || provinceKey(p.province) === provinceKey(state.province)) && searchText(text).includes(searchText(state.search));
}
function inView(p, tab = state.tab) {
  return tab === 'all' || (tab === 'active' ? activePools.includes(p.pool) : tab === 'favourites' ? p.favourite && activePools.includes(p.pool) : tab === 'closed' ? ['closed', 'excluded', 'dropped', 'inactive'].includes(p.pool) : p.pool === tab);
}
function collectionUrl() {
  const params = new URLSearchParams();
  for (const [key, value, defaultValue] of [['view', state.tab, 'ranked'], ['source', state.source, ''], ['region', state.region, ''], ['province', state.province, ''], ['sort', state.sort, 'rank'], ['q', state.search, ''], ['page', String(state.page), '1']]) if (value !== defaultValue) params.set(key, value);
  return '/' + (params.size ? '?' + params : '');
}
function rememberFilters() { history.replaceState({}, '', collectionUrl()); }
function readFilters() {
  const params = new URLSearchParams(location.search), view = params.get('view'), source = params.get('source') === 'idealista' ? 'idealista' : '';
  Object.assign(state, { tab: [...collectionTabs, 'profile', 'compare'].includes(view) ? view : source ? 'active' : 'ranked', source, region: params.get('region') || '', province: params.get('province') || '', search: params.get('q') || '', sort: ['price', 'region'].includes(params.get('sort')) ? params.get('sort') : 'rank', page: Math.max(1, Number.parseInt(params.get('page'), 10) || 1) });
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euros = value => typeof value === 'number' ? new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value) : 'Price unverified';
const date = value => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';
const url = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? esc(u.href) : '#'; } catch { return '#'; } };
const link = (href, title) => `<a href="${url(href)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`;
const short = (value, n = 175) => { const s = String(value || ''); return esc(s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s); };
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.hidden = false; setTimeout(() => el.hidden = true, 4200); }
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), 'X-CSRF-Token': state.csrf, ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Could not complete the request.'); error.status = response.status; throw error; }
  return data;
}
function header() {
  account.innerHTML = state.user ? `<div class="account"><a class="handbook-link" href="/handbook/" lang="sv">Handboken</a><span class="name">${esc(state.user.name)}</span><button id="logout">Sign out</button></div>` : '';
}
function login(error = '') {
  state.user = null; header();
  main.innerHTML = `<section class="login"><div class="eyebrow">Peter & Rebecka’s collection</div><h1>Welcome home.</h1><p class="muted">Sign in to explore the houses and share your thoughts.</p><form id="login"><label>Your name<input name="username" autocomplete="username" required placeholder="Peter or Rebecka"></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label><div id="login-error" class="${error ? 'error' : ''}" role="alert">${esc(error)}</div><button class="btn" type="submit">Open the collection</button></form></section>`;
}
async function refresh() { const data = await api('/api/properties'); state.properties = data.properties; state.meta = data.meta; }
function poolTitle(tab) { return ({ references: 'Idealista finds', ranked: 'Ranked homes', active: 'Active homes', watch: 'Price watch', favourites: 'Favourites', hold: 'On hold', closed: 'Excluded', excluded: 'Excluded', dropped: 'Removed from your list', inactive: 'Unavailable', verify: 'To evaluate', all: 'All homes & history', weekly: 'Search updates', compare: 'Compare homes', profile: 'Our search brief' })[tab]; }
function counts(properties = state.properties) {
  const c = { ranked: 0, active: 0, watch: 0, favourites: 0, hold: 0, closed: 0, verify: 0, all: properties.length };
  for (const p of properties) { if (c[p.pool] !== undefined) c[p.pool]++; if (['excluded', 'dropped', 'inactive'].includes(p.pool)) c.closed++; if (activePools.includes(p.pool)) { c.active++; if (p.favourite) c.favourites++; } }
  return c;
}
function collection() {
  if (state.tab === 'references') return showReferences();
  const c = counts();
  const tabs = collectionTabs;
  const filteredCounts = counts(state.properties.filter(matchesFilters));
  const provinces = [...new Map(state.properties.filter(p => !state.region || p.region === state.region).map(p => [provinceKey(p.province), provinceLabel(p.province)]).filter(([code]) => code)).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  main.innerHTML = `<div class="heading"><div><div class="eyebrow">Abruzzo, Marche & Dolomiti</div><h1>Finding our place in Italy.</h1><p class="muted">${c.all} homes · ${c.ranked} ranked · ${c.verify} awaiting evaluation · ${c.watch} on price watch</p></div><div class="budget-note"><strong>Purchase target ${euros(200000)}</strong><br>Up to ${euros(225000)} for a strong fit. ${euros(225000)}–${euros(260000)} needs an exceptional case.<br><button class="link-button" data-tab="profile">Our full search brief</button></div></div>
  <nav class="nav" aria-label="Property views">${tabs.map(t => `<button data-tab="${t}" class="${state.tab === t ? 'active' : ''}" aria-current="${state.tab === t ? 'page' : 'false'}">${poolTitle(t)}${filteredCounts[t] !== undefined ? `<span class="count" data-count="${t}">${filteredCounts[t]}</span>` : ''}</button>`).join('')}</nav>
  <div id="collection-content"></div>`;
  if (state.tab === 'weekly') return renderWeekly();
  if (state.tab === 'profile') return renderProfile();
  if (state.tab === 'compare') return renderCompare();
  document.querySelector('#collection-content').innerHTML = `${state.tab === 'verify' ? '<p class="notice">These homes are awaiting assessment using the same criteria as the ranked collection. Their scores will be added during the weekly update.</p>' : ''}${state.tab === 'watch' ? '<p class="notice">These homes are either above the €260,000 purchase ceiling or do not yet meet the strong-case budget gate. They retain their assessments but have no active rank. Comments and favourites do not change budget eligibility.</p>' : ''}
  <div class="filters"><label>Find a home<input id="search" type="search" placeholder="Town, property name or ID" value="${esc(state.search)}"></label><label>Region<select id="region"><option value="">All search areas</option>${[...new Set(state.properties.map(p => p.region))].sort().map(r => `<option${state.region === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></label><label>Province<select id="province"><option value="">All provinces</option>${provinces.map(([code, label]) => `<option value="${esc(code)}"${provinceKey(state.province) === code ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label>Source<select id="source"><option value="">All sources</option><option value="idealista"${state.source === 'idealista' ? ' selected' : ''}>My Idealista list</option></select></label><label>Sort by<select id="sort"><option value="rank">Overall ranking</option><option value="price">Lowest price</option><option value="region">Region & province</option></select></label></div><p id="filter-context" class="small muted"></p><div class="results-line"><span id="result-count" role="status" aria-live="polite"></span><span><button class="link-button" data-tab="compare">Compare selected (${state.compare.size}/3)</button> · <button class="link-button" id="clear-filters">Reset filters</button></span></div><div id="cards" class="grid"></div><div id="pagination"></div>`;
  document.querySelector('#sort').value = state.sort;
  renderCards();
}
function matches() {
  const p = state.properties.filter(p => inView(p) && matchesFilters(p));
  if (state.sort === 'price') p.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  else if (state.sort === 'region') p.sort((a, b) => a.region.localeCompare(b.region) || provinceLabel(a.province).localeCompare(provinceLabel(b.province)) || (a.rank ?? Infinity) - (b.rank ?? Infinity));
  else p.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  return p;
}
function renderCards() {
  const properties = matches(), pages = Math.max(1, Math.ceil(properties.length / 4));
  state.page = Math.min(state.page, pages);
  rememberFilters();
  const c = counts(state.properties.filter(matchesFilters));
  document.querySelectorAll('[data-count]').forEach(el => { el.textContent = c[el.dataset.count]; });
  document.querySelector('#filter-context').textContent = state.source ? `My Idealista list · ${c.active} active homes: ${c.ranked} ranked, ${c.verify} awaiting evaluation and ${c.watch} on price watch. On-hold and excluded homes are available in their history views. Counts reflect your current filters.` : 'Filters apply to the selected view. Active homes includes ranked, awaiting-evaluation and price-watch homes. Favourites contains homes you have marked on this website.';
  const shown = properties.slice((state.page - 1) * 4, state.page * 4);
  document.querySelector('#result-count').textContent = `${properties.length} ${properties.length === 1 ? 'home' : 'homes'} in ${poolTitle(state.tab)}${properties.length ? ` · ${(state.page - 1) * 4 + 1}–${Math.min(state.page * 4, properties.length)}` : ''}`;
  document.querySelector('#cards').innerHTML = shown.length ? shown.map(card).join('') : '<div class="empty"><h2>No homes in this view.</h2><p class="muted">Try another view or clear the filters.</p></div>';
  document.querySelector('#pagination').innerHTML = `<div class="pagination"><button data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>Previous</button><span class="small">Page ${state.page} of ${pages}</span><button data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>Next</button></div>`;
}
function card(p) {
  const photo = p.photos?.[0];
  const preview = !photo && p.referencePhoto;
  return `<article class="card"><a class="card-image" href="/properties/${esc(p.id)}" data-property="${esc(p.id)}">${photo ? `<img src="/api/media/${esc(p.id)}/0" alt="${esc(photo.caption)}" loading="lazy">` : preview ? `<img src="${url(preview.url)}" alt="${esc(preview.alt || p.name)}" referrerpolicy="no-referrer" loading="lazy">` : '<div class="no-photo">Listing photographs unavailable</div>'}<span class="rank">${p.rank ? '#' + p.rank : esc(poolTitle(p.pool) || p.band)}</span>${p.favourite ? '<span class="fav-badge" aria-label="Favourite">♥</span>' : ''}</a><div class="card-body"><div class="card-top"><span>${esc(p.region)} · ${esc(p.province)}</span><span>${esc(p.id)}</span></div><h2><a href="/properties/${esc(p.id)}" data-property="${esc(p.id)}">${esc(p.name)}</a></h2><div class="price-row"><span class="price">${euros(p.price)}</span><span class="score">${p.score ?? '—'}<small> / 100 fit</small></span></div><span class="chip ${p.price > 225000 ? 'warning' : 'green'}">${esc(p.band)}</span>${p.rejected ? '<span class="chip warning">Rejected</span>' : ''}${p.referenceIds?.length ? '<span class="chip">Your Idealista list</span>' : ''}${p.removedFromSharedList ? '<span class="chip warning">Removed from shared list</span>' : ''}${p.status !== 'Open' ? `<span class="chip">${esc(p.status)}</span>` : ''}${p.pool === 'watch' ? `<p class="small muted">${p.reductionToCeiling > 0 ? `${euros(p.reductionToCeiling)} reduction to reach the ceiling` : esc(p.budgetGateReason || 'Unranked: unusually strong case or materially lower development burden not yet established.')}</p>` : ''}<dl class="card-facts"><div><dt>Buildings</dt><dd>${esc(p.size || 'Not verified')}</dd></div><div><dt>Land</dt><dd>${esc(p.land || 'Not verified')}</dd></div></dl><p class="small muted">${short(p.why)}</p><div class="card-actions"><a class="btn secondary" href="/properties/${esc(p.id)}" data-property="${esc(p.id)}">View dossier</a><label class="check-label small"><input type="checkbox" data-compare="${esc(p.id)}" ${state.compare.has(p.id) ? 'checked' : ''}>Compare</label></div></div></article>`;
}
function renderWeekly() {
  const runs = state.meta.weeklyRuns?.runs || [];
  document.querySelector('#collection-content').innerHTML = `<div class="timeline">${runs.length ? runs.map(r => `<article class="panel"><div class="eyebrow">${date(r.scan_date)}</div><h2>${esc(r.status)}</h2><p>${esc(r.summary)}</p><p class="small muted">${esc(r.coverage_note)}</p><div class="scan-links">${(r.new_to_register_ids || []).map(id => `<a href="/properties/${esc(id)}" data-property="${esc(id)}">${esc(id)}</a>`).join('')}</div></article>`).join('') : '<div class="empty">No search reports have been imported yet.</div>'}</div><p class="small muted">These are recorded searches, not a claim of current availability. New-to-register does not mean newly listed.</p>`;
}
function renderProfile() {
  document.querySelector('#collection-content').innerHTML = `<section class="panel"><h2>Our home + B&B brief</h2><p>Search areas: Abruzzo, Marche and Dolomiti. Your intentionally saved homes elsewhere also receive an individual assessment.</p><p>Purchase target €200,000; absolute ceiling €260,000. Development baseline €150,000. An optional additional €50,000 means an extra year, approximately three years in total.</p><p class="notice">Land supports physical potential for a pool, parking and growing. Planning permission, conversions and the legal use of agricultural land always need separate verification.</p><p>${state.meta.profileUrl ? link(state.meta.profileUrl, 'Open the authoritative Master Profile') : ''}</p>${state.meta.profile ? `<details><summary>Read the full profile</summary><div class="details-body">${esc(state.meta.profile).replace(/\r?\n/g, '<br>')}</div></details>` : ''}<p class="small"><a href="/handbook/" lang="sv">Handboken · Abruzzo &amp; Marche</a> ${state.meta.registerUrl ? ' · ' + link(state.meta.registerUrl, 'Source register') : ''}</p></section>`;
}
function renderCompare() {
  const ps = state.properties.filter(p => state.compare.has(p.id));
  const rows = [['Asking price', p => euros(p.price)], ['Budget', p => p.band], ['Overall rank', p => p.rank ? '#' + p.rank : 'Unranked'], ['Fit score', p => (p.score ?? '—') + ' / 100'], ['Buildings', p => p.size], ['Land', p => p.land], ['Owner home', p => p.owner], ['B&B potential', p => p.bb], ['Verification gates', p => p.risks], ['All-in low / high', p => euros(p.allLow) + ' / ' + euros(p.allHigh)], ['Decision', p => p.status]];
  document.querySelector('#collection-content').innerHTML = ps.length ? `<section class="panel"><h2>Compare homes</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Property</th>${ps.map(p => `<th><a href="/properties/${p.id}" data-property="${p.id}">${esc(p.name)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([label, fn]) => `<tr><th>${label}</th>${ps.map(p => `<td>${esc(fn(p) || 'Not verified')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : '<div class="empty"><h2>Choose up to three homes.</h2><p>Tick Compare on a property card to see them side by side.</p><button class="btn secondary" data-tab="ranked">Browse ranked homes</button></div>';
}
function evidenceClass(value) { return value.includes('UNKNOWN') ? 'warning' : value.includes('LIKELY') ? 'green' : ''; }
async function showProperty(id, draft = '') {
  main.innerHTML = '<p class="loading" role="status">Opening the dossier…</p>';
  try { state.detail = await api(`/api/properties/${id}`); if (state.detail.property.referenceOnly) return navigateReference(state.detail.property.referenceId); detail(draft); }
  catch (error) { if (error.status === 401) return login(); main.innerHTML = `<p class="error">${esc(error.message)}</p><button class="btn secondary" id="back">Back to collection</button>`; }
}
function detail(draft = '') {
  const { property: p, events, nextBefore, snapshots } = state.detail;
  const photos = p.photos || [];
  const groups = new Map();
  for (const row of p.dossier || []) { if (!groups.has(row.topic)) groups.set(row.topic, []); groups.get(row.topic).push(row); }
  const costRows = [['Building works', 'Building works low', 'Building works high'], ['Site, pool & energy', 'Site / pool / energy low', 'Site / pool / energy high'], ['Furniture & launch', 'Furniture / launch low', 'Furniture / launch high'], ['Acquisition reserve', 'Acquisition reserve low 8%', 'Acquisition reserve high 13%'], ['Total including purchase', 'All-in low', 'All-in high']];
  main.innerHTML = `<div class="breadcrumb"><a href="/" id="back">← Back to collection</a><span>${esc(p.region)} · ${esc(p.province)} · ${esc(p.id)}</span></div><div class="heading property-heading"><div><div class="eyebrow">${p.rank ? 'Rank #' + p.rank : esc(poolTitle(p.pool) || p.band)} · ${esc(p.tier)}</div><h1>${esc(p.name)}</h1><span class="chip ${p.price > 225000 ? 'warning' : 'green'}">${esc(p.band)}</span><span class="chip">${esc(p.status)}</span></div><div class="property-price"><div class="price">${euros(p.price)}</div><p class="small muted">Advertised asking price</p><span class="score">${p.score ?? '—'}<small> / 100 fit</small></span></div></div>
  ${p.rejected ? `<p class="notice">This home is excluded because at least one of you rejected it. It stays excluded while either rejection remains. Review your decisions here: ${p.rejectionReferenceIds.map(id => `<a href="/references/${id}">Idealista review ${id}</a>`).join(' · ')}.</p>` : ''}
  ${p.removedFromSharedList ? '<p class="notice">Removed from your shared Idealista list and dropped from active ranking. Its dossier and history are retained.</p>' : ''}
  ${p.pool === 'inactive' ? '<p class="notice">The known adverts are recorded as unavailable. This home has no active rank.</p>' : ''}
  ${p.pool === 'watch' ? `<p class="notice">${p.reductionToCeiling > 0 ? `${euros(p.reductionToCeiling)} above the purchase ceiling; ${euros(p.reductionToTarget)} above the target.` : esc(p.budgetGateReason || 'The unusually strong HOME + B&B case or materially lower development burden needed for this price has not yet been established.')} This home has no active rank.</p>` : p.requiresStrongCase ? '<p class="notice">This is a stretch purchase. An unusually strong HOME + B&B case or materially lower development burden is required. A high score alone does not establish affordability.</p>' : ''}
  ${photos.length ? `<div class="gallery ${photos.length === 1 ? 'one' : ''}">${photos.slice(0, 3).map((photo, n) => `<button data-photo="${n}" aria-label="Enlarge ${esc(photo.caption)}"><img src="/api/media/${p.id}/${n}" alt="${esc(photo.caption)}"></button>`).join('')}</div><p class="photo-credit">Original listing photographs · ${[...new Set(photos.map(x => x.source_url).filter(Boolean))].map(href => link(href, new URL(href).hostname)).join(' · ')}. Not evidence of permissions or condition.</p>` : '<p class="notice">Listing photographs are currently unavailable for this property.</p>'}
  <dl class="quickfacts"><div><dt>Buildings — advertised scope</dt><dd>${esc(p.size)}</dd></div><div><dt>Included land</dt><dd>${esc(p.land)}</dd></div><div><dt>Last source check</dt><dd>${date(p.checked)}<br><span class="small muted">Seller availability not confirmed</span></dd></div></dl>
  <div class="detail-grid"><div class="detail-content"><section class="panel"><h2>Why it’s in the collection</h2><p>${esc(p.why)}</p><h3>What needs checking</h3><p>${esc(p.risks)}</p></section><section class="panel"><h2>A home for us. A place for guests.</h2><h3>Owner accommodation & privacy</h3><p>${esc(p.owner)}</p><h3>B&B layout potential</h3><p>${esc(p.bb)}</p></section>
  ${[...groups].map(([topic, rows]) => `<details><summary>${esc(topic)}</summary><div class="details-body">${rows.map(r => `<div class="evidence"><span class="chip ${evidenceClass(r.evidence)}">${esc(r.evidence)}</span><p>${esc(r.text)}</p>${r.source ? link(r.source, 'Source') : ''}</div>`).join('')}</div></details>`).join('')}
  <details><summary>Development costs & total investment</summary><div class="details-body"><p class="small">Screening allowances, not quotations. €150,000 is the development baseline; the optional €200,000 scenario adds a third year.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Scope</th><th>Low</th><th>High</th></tr></thead><tbody>${costRows.map(([label, low, high]) => `<tr><th>${label}</th><td class="numeric">${euros(p.costs?.[low])}</td><td class="numeric">${euros(p.costs?.[high])}</td></tr>`).join('')}</tbody></table></div><p class="small muted">${esc(p.costs?.['Budget limitation'])}</p></div></details>
  <details><summary>Score breakdown</summary><div class="details-body">${Object.entries(p.components || {}).map(([k, v]) => `<div class="score-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}<p class="small muted">Fit scores and budget eligibility are separate. Missing permissions are not approvals.</p></div></details>
  <details><summary>Sources & price observations</summary><div class="details-body sources">${(p.sources || []).map(s => `<div class="source-item">${link(s.url, s.portal || s.url)}<br>${esc(s.agent || '')} · ${euros(s.observed_price)} · ${date(s.checked)}<p class="muted">${esc(s.note || '')}</p></div>`).join('')}<h3>Imported price snapshots</h3>${snapshots.map(s => `<p class="small">${date(s.observed_at)} · ${euros(s.price)}</p>`).join('')}</div></details></div>
  <aside class="sticky">${p.referenceIds?.length ? `<section class="panel"><h2>Idealista notes & decisions</h2><p class="small">A rejection by either of you excludes this home.</p>${p.referenceIds.map(id => `<p><a href="/references/${id}" data-reference="${id}">Review listing ${id}</a></p>`).join('')}</section>` : ''}<section class="panel feedback"><h2>Our decision</h2><p class="small muted">Shared by Peter and Rebecka. Closing keeps the dossier and history.</p><form id="feedback"><label>Status<select name="status">${['Open', 'Interested', 'On hold', 'Closed'].map(s => `<option${s === p.status ? ' selected' : ''}>${s}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" name="favourite" ${p.favourite ? 'checked' : ''}>Keep in favourites</label><label>Your comment<textarea name="comment" maxlength="8000" placeholder="What do we think? What should we ask or check?">${esc(draft)}</textarea></label><div id="feedback-error" role="alert"></div><button class="btn" type="submit">Save our decision</button></form><p class="small muted">Saved as ${esc(state.user.name)}. A price change never reopens a closed or held home.</p></section><section class="panel"><h2>Conversation & history</h2><div id="history">${eventsHtml(events)}</div>${nextBefore ? `<button class="link-button" id="more-history" data-before="${nextBefore}">Earlier history</button>` : ''}</section><section class="panel"><h3>Explore the listing</h3>${link(p.source, 'Open primary listing')}<p class="small muted">${p.driveUrl ? link(p.driveUrl, 'Original Drive dossier') : ''}</p></section></aside></div>`;
}
function eventsHtml(events) { return events.length ? events.map(e => `<article class="history"><strong>${esc(e.actor_name)}</strong><br><small>${date(e.created_at)} · ${esc(e.status)}${e.favourite ? ' · Favourite' : ''}</small>${e.comment ? `<p>${esc(e.comment)}</p>` : ''}</article>`).join('') : '<p class="small muted">No comments yet. Start the conversation above.</p>'; }
function navigate(id) { if (!id && state.tab === 'references') state.tab = 'ranked'; history.pushState({}, '', id ? `/properties/${id}` : collectionUrl()); if (id) showProperty(id); else collection(); window.scrollTo({ top: 0 }); }
document.addEventListener('click', async event => {
  const target = event.target.closest('a,button'); if (!target) return;
  if (target.dataset.property) { event.preventDefault(); navigate(target.dataset.property); }
  else if (target.id === 'back' || target.classList.contains('brand')) { event.preventDefault(); await refresh().catch(() => {}); navigate(); }
  else if (target.dataset.tab) { state.tab = target.dataset.tab; state.page = 1; if (state.tab === 'references') navigateReference(); else { history.pushState({}, '', collectionUrl()); collection(); } }
  else if (target.dataset.page) { state.page = Number(target.dataset.page); renderCards(); document.querySelector('.filters').scrollIntoView({ block: 'start' }); }
  else if (target.id === 'clear-filters') { Object.assign(state, { search: '', region: '', province: '', sort: 'rank', source: '', page: 1 }); collection(); }
  else if (target.id === 'logout') { try { await api('/api/logout', { method: 'POST' }); state.properties = []; state.meta = {}; state.detail = null; Object.assign(referenceState, { homes: [], meta: null, detail: null }); login(); } catch (e) { toast(e.message); } }
  else if (target.dataset.photo !== undefined) { const n = Number(target.dataset.photo), p = state.detail.property, dialog = document.querySelector('#lightbox'); dialog.querySelector('img').src = `/api/media/${p.id}/${n}`; dialog.querySelector('img').alt = p.photos[n].caption; dialog.querySelector('p').textContent = p.photos[n].caption; dialog.showModal(); }
  else if (target.classList.contains('lightbox-close')) document.querySelector('#lightbox').close();
  else if (target.id === 'more-history') { try { const d = await api(`/api/properties/${state.detail.property.id}?before=${target.dataset.before}`); document.querySelector('#history').insertAdjacentHTML('beforeend', eventsHtml(d.events)); if (d.nextBefore) target.dataset.before = d.nextBefore; else target.remove(); } catch (e) { toast(e.message); } }
});
document.addEventListener('input', event => { if (event.target.id === 'search') { state.search = event.target.value; state.page = 1; renderCards(); } });
document.addEventListener('change', event => {
  const t = event.target;
  if (['region', 'province', 'sort', 'source'].includes(t.id)) {
    state[t.id] = t.value; state.page = 1;
    if (t.id === 'region') state.province = '';
    if (t.id === 'source' && t.value === 'idealista') state.tab = 'active';
    if (['region', 'source'].includes(t.id)) collection(); else renderCards();
  }
  if (t.dataset.compare) { const id = t.dataset.compare; if (t.checked && state.compare.size === 3) { t.checked = false; return toast('Choose up to three homes to compare.'); } t.checked ? state.compare.add(id) : state.compare.delete(id); const btn = document.querySelector('[data-tab="compare"]'); if (btn) btn.textContent = `Compare selected (${state.compare.size}/3)`; }
});
document.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target, button = form.querySelector('button[type="submit"]'); if (!button || !['login', 'feedback'].includes(form.id)) return;
  button.disabled = true;
  if (form.id === 'login') {
    try { const data = await api('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); state.user = data.user; state.csrf = data.csrf; header(); await refresh(); route(); }
    catch (e) { const el = document.querySelector('#login-error'); if (el) { el.className = 'error'; el.textContent = e.message; } }
  } else if (form.id === 'feedback') {
    const fields = new FormData(form), comment = fields.get('comment'), p = state.detail.property;
    state.requestId ||= crypto.randomUUID();
    try {
      await api(`/api/properties/${p.id}/feedback`, { method: 'POST', body: JSON.stringify({ requestId: state.requestId, revision: p.revision, status: fields.get('status'), favourite: fields.has('favourite'), comment }) });
      state.requestId = null; await refresh(); await showProperty(p.id); toast('Decision saved for both of you.');
    } catch (e) {
      if (e.status === 409) { state.requestId = null; await showProperty(p.id, comment); }
      const el = document.querySelector('#feedback-error'); if (el) { el.className = 'error'; el.textContent = e.message; }
    }
  }
  button.disabled = false;
});
function route() {
  const next = new URLSearchParams(location.search).get('next');
  if (next && state.user) {
    try { const destination = new URL(next, location.origin); if (destination.origin === location.origin && /^\/handbook(?:\/|$)/.test(destination.pathname)) { location.assign(destination.href); return; } } catch {}
  }
  const reference = /^\/references(?:\/(\d{5,12}))?\/?$/.exec(location.pathname);
  if (reference) return reference[1] ? showReference(reference[1]) : showReferences();
  if (state.tab === 'references') state.tab = 'ranked';
  const match = /^\/(?:properties\/)?((?:AB|MR|DL|IL)\d+)(?:\.html)?$/.exec(location.pathname);
  if (match) showProperty(match[1]); else { readFilters(); collection(); }
}
window.addEventListener('popstate', route);
(async () => { try { const session = await api('/api/session'); state.user = session.user; state.csrf = session.csrf; header(); await refresh(); route(); } catch (e) { login(e.status === 401 ? '' : e.message); } })();
