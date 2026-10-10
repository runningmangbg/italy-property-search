const referenceState = { homes: [], meta: null, search: '', verdict: '', region: '', decision: 'active', page: 1, detail: null, requestId: null, decisionRequest: null };
const verdictLabels = { 'outside-brief': 'Outside current brief', concern: 'Major questions', potential: 'Worth investigating', 'needs-review': 'Needs more evidence' };
function referencePhoto(h, large = false) {
  return h.photo ? `<img src="${url(h.photo.url)}" alt="${esc(h.photo.alt || h.name)}" referrerpolicy="no-referrer" ${large ? '' : 'loading="lazy"'}>` : '<div class="no-photo">Open Idealista to see the photographs</div>';
}
function referenceChip(h) { return `<span class="chip ${h.assessment.verdict === 'potential' ? 'green' : h.assessment.verdict === 'needs-review' ? '' : 'warning'}">${esc(verdictLabels[h.assessment.verdict])}</span>`; }
function decisionChip(h) {
  const votes = h.review?.decisions.filter(d => d.rejected) || [];
  return votes.length ? `<span class="chip warning">${votes.length === 2 ? 'Rejected by both' : esc(votes[0].name) + ' rejected · excluded'}</span>` : '';
}
function decisionPanel(h) {
  const review = h.review, mine = review.decisions.find(d => d.id === state.user.id);
  if (!mine) return '';
  const email = review.email;
  const message = email?.state === 'sent' ? `Removal email sent to Peter on ${date(email.sentAt)}. It will not be sent again for this listing.` : !review.bothRejected ? 'An email is queued only when both of you reject this home. Either person can undo their own rejection.' : email?.state === 'needs_check' ? 'Email delivery needs checking. A second email will not be sent while the first result is uncertain.' : email?.state === 'sending' ? 'The removal email is being processed.' : 'Removal email queued for Peter. The delivery task checks hourly.';
  return `<section class="panel feedback reference-decision"><h2>Do we want to keep it?</h2><div class="decision-people">${review.decisions.map(d => `<div><strong>${esc(d.name)}</strong><span class="chip ${d.rejected ? 'warning' : ''}">${d.rejected ? 'Rejected' : 'Not rejected'}</span>${d.reason ? `<p class="small">${esc(d.reason)}</p>` : ''}</div>`).join('')}</div><p class="small muted">${message}</p><form id="reference-decision"><label>Your reason <span class="muted">(optional)</span><textarea name="reason" maxlength="2000" placeholder="Why does this home not work for us?">${esc(mine.reason)}</textarea></label><div id="reference-decision-error" role="alert"></div><button class="btn ${mine.rejected ? 'secondary' : ''}" type="submit" name="rejected" value="${mine.rejected ? 'false' : 'true'}">${mine.rejected ? 'Undo my rejection' : 'Reject this property'}</button></form><p class="small muted">Saved as ${esc(state.user.name)}. Either person’s rejection excludes it from ranking and active views. Undoing your rejection does not override the other person’s decision. Its history is kept.</p>${review.bothRejected ? `<p>${link(h.url,'Open Idealista to remove this favourite')}</p>` : ''}</section>`;
}
async function showReferences() {
  try {
    await refresh();
    Object.assign(state, { tab: 'active', source: 'idealista', agency: '', search: '', region: '', province: '', sort: 'rank', page: 1 });
    rememberFilters();
    collection();
  } catch (e) { if (e.status === 401) return login(); main.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
}
function referenceNotes(notes) { return notes.length ? notes.map(n => `<article class="history"><strong>${esc(n.actor_name)}</strong><br><small>${date(n.created_at)}</small><p>${esc(n.comment)}</p></article>`).join('') : '<p class="small muted">No notes yet.</p>'; }
async function showReference(id) {
  main.innerHTML = '<p class="loading" role="status">Opening this saved home…</p>';
  try {
    const data = await api(`/api/references/${id}`); referenceState.detail = data; referenceState.requestId = null; referenceState.decisionRequest = null;
    const h = data.home, a = h.assessment;
    const matches = state.properties.filter(p => p.referenceIds?.includes(h.id) && !p.referenceOnly);
    const ranked = state.properties.find(p => p.referenceIds?.includes(h.id));
    main.innerHTML = `<div class="breadcrumb"><a href="/" id="back">← Back to collection</a><span>${esc(h.region)} · ${esc(h.province)} · ${h.id}</span></div><div class="heading property-heading"><div><div class="eyebrow">${ranked?.rank ? 'Rank #' + ranked.rank : esc(poolTitle(ranked?.pool) || 'Awaiting evaluation')} · Your Idealista find</div><h1>${esc(h.name)}</h1>${referenceChip(h)}${decisionChip(h)}${ranked?.score != null ? `<span class="score">${ranked.score}<small> / 100 fit</small></span>` : ''}</div><div class="property-price"><div class="price">${euros(h.price)}</div><p class="small muted">Advertised asking price</p></div></div>
    ${!h.listed ? '<p class="notice">This home was absent from the latest shared-list import. It is dropped from active ranking. Its review and your notes are retained; absence does not establish that it was sold.</p>' : ''}
    <div class="reference-hero">${referencePhoto(h,true)}</div><p class="photo-credit">Original Idealista listing image · ${link(h.url,'Open on Idealista')}</p>
    <dl class="quickfacts"><div><dt>Advertised area</dt><dd>${esc(h.area || 'Not stated')}</dd></div><div><dt>Land / outside space</dt><dd>${esc(h.land || 'Not established')}</dd></div><div><dt>Review evidence</dt><dd>${esc(a.basis)}<br><span class="small muted">Checked ${date(h.checkedAt || referenceState.meta?.observedAt || state.meta.idealistaReferences?.observedAt)}; seller availability unconfirmed.</span></dd></div></dl>
    <div class="detail-grid"><div class="detail-content"><section class="panel"><h2>Could this work for us?</h2><p>${esc(a.summary)}</p><p class="small muted">This is a screening judgment against your brief. It does not establish technical condition, lawful use or a costed conversion.</p></section>
    ${a.positives.length ? `<section class="panel"><h2>What may appeal</h2><ul>${a.positives.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="small muted">Features advertised in the listing; tell us which matter to you.</p></section>` : ''}
    <section class="panel"><h2>What must be resolved</h2><ul>${a.questions.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>
    ${matches.length ? `<section class="panel"><h2>Already in our assessed collection</h2>${matches.map(p => `<p><a href="/properties/${p.id}" data-property="${p.id}">${esc(p.id)} · ${esc(p.name)}</a><br><span class="small">${euros(p.price)} in dossier · ${esc(p.status)}${p.price !== h.price ? ' · Price differs from this listing; resolve the scope and price before relying on either.' : ''}</span></p>`).join('')}<p class="small muted">${esc(h.matchNote)} Your existing decisions and dossier history are preserved.</p></section>` : ''}
    ${h.duplicateOf ? `<p class="notice">This appears to advertise the same property as <a href="/references/${h.duplicateOf}" data-reference="${h.duplicateOf}">${h.duplicateOf}</a>. Both source listings are kept.</p>` : ''}
    <section class="panel"><h2>The practical test</h2><p class="small">A private owner home and 4–6 future guest rooms must fit within lawful, usable space. Check access, parking, pool feasibility, structure, services and a complete €150,000 development plan. Storage, attic and commercial square metres are not automatically habitable area. The optional extra €50,000 requires a separate decision and a third year.</p><button class="link-button" data-tab="profile">Read our full search brief</button></section></div>
    <aside class="sticky">${decisionPanel(h)}<section class="panel feedback"><h2>What do we like here?</h2><p class="small muted">Share the details that catch your eye, and anything that puts you off. Notes are shared between both accounts.</p><form id="reference-note"><label>Your note<textarea name="comment" maxlength="8000" required placeholder="The stonework and terrace are right for us; the layout feels too cramped…"></textarea></label><div id="reference-note-error" role="alert"></div><button class="btn" type="submit">Save our note</button></form><p class="small muted">Saved as ${esc(state.user.name)}.</p></section><section class="panel"><h2>Our notes</h2><div id="reference-notes">${referenceNotes(data.notes)}</div>${data.nextBefore ? `<button class="link-button" id="reference-more-notes" data-before="${data.nextBefore}">Earlier notes</button>` : ''}</section><section class="panel"><h3>The source</h3>${link(h.url,'Open this home on Idealista')}</section></aside></div>`;
  } catch (e) { if (e.status === 401) return login(); main.innerHTML = `<p class="error">${esc(e.message)}</p><a href="/references" data-reference-list>Back to favourites</a>`; }
}
function navigateReference(id) { history.pushState({},'',id ? `/references/${id}` : '/references'); id ? showReference(id) : showReferences(); window.scrollTo({ top:0 }); }
document.addEventListener('click', async event => {
  const t = event.target.closest('a,button'); if (!t) return;
  if (t.dataset.reference) { event.preventDefault(); navigateReference(t.dataset.reference); }
  else if (t.hasAttribute('data-reference-list')) { event.preventDefault(); navigateReference(); }
  else if (t.id === 'reference-more-notes') { try { const d = await api(`/api/references/${referenceState.detail.home.id}?before=${t.dataset.before}`); document.querySelector('#reference-notes').insertAdjacentHTML('beforeend',referenceNotes(d.notes)); if (d.nextBefore) t.dataset.before = d.nextBefore; else t.remove(); } catch(e) { toast(e.message); } }
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'reference-note') return;
  event.preventDefault(); const form = event.target, button = form.querySelector('button'); button.disabled = true;
  referenceState.requestId ||= crypto.randomUUID();
  try { const id = referenceState.detail.home.id; await api(`/api/references/${id}/notes`,{method:'POST',body:JSON.stringify({requestId:referenceState.requestId,comment:new FormData(form).get('comment')})}); await showReference(id); toast('Note saved for both of you.'); }
  catch(e) { const el = document.querySelector('#reference-note-error'); if (el) { el.className='error'; el.textContent=e.message; } if(e.status === 409) referenceState.requestId=null; button.disabled=false; }
});
document.addEventListener('error', event => { if (event.target.tagName === 'IMG' && event.target.closest('[data-reference],.reference-hero,.card-image')) { const image = event.target; const fallback = document.createElement('div'); fallback.className='no-photo'; fallback.textContent='Photo unavailable here · open the Idealista listing'; image.replaceWith(fallback); } },true);

document.addEventListener('submit', async event => {
  if (event.target.id !== 'reference-decision') return;
  event.preventDefault();
  const form = event.target, button = form.querySelector('button'), h = referenceState.detail.home;
  const mine = h.review.decisions.find(d => d.id === state.user.id);
  const reason = new FormData(form).get('reason'), rejected = button.value === 'true';
  const key = JSON.stringify({ id: h.id, revision: mine.revision, reason, rejected });
  if (referenceState.decisionRequest?.key !== key) referenceState.decisionRequest = { key, id: crypto.randomUUID() };
  button.disabled = true;
  try {
    await api(`/api/references/${h.id}/decision`, { method: 'POST', body: JSON.stringify({requestId:referenceState.decisionRequest.id, revision:mine.revision, rejected, reason}) });
    await refresh(); await showReference(h.id);
    toast(rejected ? 'Your rejection is saved.' : 'Your rejection is undone.');
  } catch (e) {
    const el = document.querySelector('#reference-decision-error');
    if (el) { el.className = 'error'; el.textContent = e.message; }
    if (e.status === 409) referenceState.decisionRequest = null;
    button.disabled = false;
  }
});
