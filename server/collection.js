// A physical home has one place in the collection, regardless of source.
// Only recorded matches, duplicate links and exact listing URLs join identities.
const unavailable = new Set(['sold', 'withdrawn', 'removed', 'unavailable']);

function listingIds(value, found = new Set()) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/https?:\/\/(?:www\.)?idealista\.it\/immobile\/(\d{5,12})(?=\/|[?#\s]|$)/g)) found.add(m[1]);
  } else if (Array.isArray(value)) value.forEach(v => listingIds(v, found));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => listingIds(v, found));
  return found;
}

export function collectionRows(properties, references, votes) {
  const parents = new Map();
  const find = key => {
    if (!parents.has(key)) parents.set(key, key);
    if (parents.get(key) !== key) parents.set(key, find(parents.get(key)));
    return parents.get(key);
  };
  const join = (a, b) => parents.set(find(a), find(b));
  const propertyIds = new Set(properties.map(p => p.id));
  const referenceIds = new Set(references.map(h => h.id));
  for (const p of properties) {
    find('p:' + p.id);
    const ids = listingIds([p.data.source, p.data.sources]);
    if (/^IL\d{5,12}$/.test(p.id)) ids.add(p.id.slice(2));
    for (const id of ids) join('p:' + p.id, 'r:' + id);
  }
  for (const h of references) {
    find('r:' + h.id);
    for (const id of h.data.matches || []) if (propertyIds.has(id)) join('r:' + h.id, 'p:' + id);
    if (h.data.duplicateOf && referenceIds.has(h.data.duplicateOf)) join('r:' + h.id, 'r:' + h.data.duplicateOf);
  }
  const groups = new Map();
  const group = key => {
    const root = find(key);
    if (!groups.has(root)) groups.set(root, { properties: [], references: [] });
    return groups.get(root);
  };
  for (const p of properties) group('p:' + p.id).properties.push(p);
  for (const h of references) group('r:' + h.id).references.push(h);
  return [...groups.values()].map(g => {
    // Keep established dossier IDs when an Idealista source is later matched.
    g.properties.sort((a, b) => Number(a.id.startsWith('IL')) - Number(b.id.startsWith('IL')) || a.id.localeCompare(b.id));
    g.references.sort((a, b) => Number(!!a.data.duplicateOf) - Number(!!b.data.duplicateOf) || a.id.localeCompare(b.id));
    const stored = g.properties[0], reference = g.references[0];
    const h = reference?.data;
    const base = stored || { id: 'IL' + h.id, imported_at: reference.imported_at, data: {
      id: 'IL' + h.id, name: h.name, price: h.price, score: null,
      region: h.region, province: h.province, size: h.area, land: h.land,
      source: h.url, why: h.assessment.summary, checked: h.checkedAt,
      evaluationPending: true, referenceOnly: true, referenceId: h.id,
      referencePhoto: h.photo || null, photos: [], dossier: [],
    } };
    const ids = new Set(g.references.map(r => r.id));
    const rejected = votes.filter(v => ids.has(v.reference_id) && ['peter', 'rebecka'].includes(v.user_id) && v.rejected);
    const rejectionIds = [...new Set(rejected.map(v => v.reference_id))];
    const bothIds = rejectionIds.filter(id => new Set(rejected.filter(v => v.reference_id === id).map(v => v.user_id)).size === 2);
    const removedIds = g.references.filter(r => r.listed === false).map(r => r.id);
    const excludedAliases = g.properties.filter(p => ['Closed', 'On hold'].includes(p.status));
    const effectiveStatus = excludedAliases.some(p => p.status === 'Closed') ? 'Closed' : excludedAliases.length ? 'On hold' : base.status;
    const availability = stored?.data.availability || (g.references.length && g.references.every(r => unavailable.has(r.data.availability)) ? 'unavailable' : g.references.some(r => r.data.availability === 'advertised') ? 'advertised' : 'unknown');
    return {
      ...base,
      data: { ...base.data, availability, referenceIds: [...ids],
        aliasPropertyIds: g.properties.slice(1).map(p => p.id),
        referencePhoto: base.data.referencePhoto || h?.photo || null,
        exclusionReasons: [
          ...(rejectionIds.length ? ['Rejected by ' + [...new Set(rejected.map(v => v.user_id === 'peter' ? 'Peter' : 'Rebecka'))].join(' and ')] : []),
          ...(removedIds.length ? ['Removed from the shared Idealista list'] : []),
          ...excludedAliases.filter(p => p.id !== base.id).map(p => p.id + ': ' + p.status),
        ],
      },
      effective_status: effectiveStatus,
      favourite: g.properties.some(p => p.favourite),
      rejection_reference_ids: rejectionIds,
      jointly_rejected_reference_ids: bothIds,
      removed_reference_ids: removedIds,
    };
  });
}
