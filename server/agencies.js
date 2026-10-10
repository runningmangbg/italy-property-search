// Agency identities come from recorded advertiser names, never portal names
// or guesses based on a property's location. Keep distinct offices separate.
const key = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const aliases = new Map([
  ['monica-bruni', 'Monica Bruni Real Estate'],
  ['monica-bruni-real-estate', 'Monica Bruni Real Estate'],
  ['puzielli', 'Immobiliare Puzielli'],
  ['immobiliare-puzielli', 'Immobiliare Puzielli'],
  ['majellacase', 'Majellacase'],
  ['la-tua-casa-immobiliare', 'La Tua Casa Immobiliare'],
]);

function agency(value) {
  if (typeof value !== 'string') return null;
  // Older imports append a contact name or listing reference after a middle dot.
  const name = value.split(/\s*·\s*/)[0].replace(/\s+/g, ' ').trim();
  if (!name || /^(?:see original advert|unknown|not (?:recorded|known|specified|available)|n\/?a|[-—])$/i.test(name)
    || /^(?:agent not |advertiser in )/i.test(name) || /name not captured/i.test(name)
    || /^(?:https?:\/\/|idealista(?:\.it)?$|immobiliare\.it$|casa\.it$|wikicasa(?:\.it)?$|gate-away(?:\.com)?$)/i.test(name)) return null;
  const label = aliases.get(key(name)) || name;
  const id = key(label);
  return id ? { id, name: label } : null;
}

export function propertyAgencies(records) {
  const found = new Map();
  for (const record of records) {
    const sources = Array.isArray(record.sources) ? record.sources : [];
    for (const value of [record.agency, record.agent, ...sources.flatMap(s => s && typeof s === 'object' ? [s.agent, s.agency, s['Agent / reference']] : [])]) {
      const entry = agency(value);
      if (entry && !found.has(entry.id)) found.set(entry.id, entry);
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}
