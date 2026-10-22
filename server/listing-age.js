// Dates are evidence, not import/update timestamps. Keep publication and discovery separate.
export function listingDay(value, today = new Date().toISOString().slice(0, 10)) {
  if (value instanceof Date) value = value.toISOString();
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const day = value.slice(0, 10), parsed = new Date(day);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day || day > today) return null;
  return day;
}

export function earliestListingDay(...values) {
  return values.map(v => listingDay(v)).filter(Boolean).sort()[0] || null;
}

export function listingHistory(records) {
  const publications = [], sightings = [];
  const add = (list, values, sourceUrl) => {
    for (const value of values) {
      const day = listingDay(value);
      if (day) list.push({ day, sourceUrl: sourceUrl || '' });
    }
  };
  for (const record of records) {
    const p = record.data || record;
    add(publications, [p.publishedAt, p.published_at], p.source || p.url);
    add(sightings, [p.firstSeenAt, p.first_seen, record.first_observed_at], p.source || p.url);
    for (const s of p.sources || []) {
      add(publications, [s.publishedAt, s.published_at], s.url);
      add(sightings, [s.firstSeenAt, s.first_seen], s.url);
    }
  }
  publications.sort((a, b) => a.day.localeCompare(b.day));
  sightings.sort((a, b) => a.day.localeCompare(b.day));
  const published = publications[0], seen = sightings[0];
  // An older sighting is stronger evidence of a minimum age than a newer relisting date.
  const exact = published && (!seen || published.day <= seen.day);
  const evidence = exact ? published : seen;
  return { publishedAt: published?.day || null, firstSeenAt: seen?.day || null,
    since: evidence?.day || null, basis: evidence ? exact ? 'published' : 'first-seen' : 'unknown', sourceUrl: evidence?.sourceUrl || '' };
}
