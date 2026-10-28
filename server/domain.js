import { createHash } from 'node:crypto';
import { collectionRows } from './collection.js';
import { earliestListingDay } from './listing-age.js';
import { normalizeGeography, excludedGeography } from './geography.js';
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');

export function normalizeDossier(dossier) {
  if (!Array.isArray(dossier)) return [];
  return dossier.map(value => {
    const row = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const field = (key, legacy, fallback = '') => [row[key], row[legacy]].find(v => typeof v === 'string' && v.trim()) ?? fallback;
    return {
      ...row,
      topic: field('topic', 'Assessment topic', 'Assessment'),
      evidence: field('evidence', 'Evidence class', 'UNKNOWN/NEEDS VERIFICATION'),
      text: field('text', 'Assessment and next verification', typeof value === 'string' ? value : ''),
      source: field('source', 'Source'),
    };
  });
}

export function budget(property, decision = {}) {
  const price = property.price;
  const known = Number.isFinite(price) && price > 0;
  const gatedFromRanking = known && price <= 260000 && property.budgetEligible === false;
  let pool = !known ? 'verify' : price > 260000 || gatedFromRanking ? 'watch' : 'ranked';
  if (pool === 'ranked' && (property.evaluationPending || ('score' in property && !Number.isFinite(property.score)))) pool = 'verify';
  const geographyExcluded = excludedGeography(property);
  if (geographyExcluded) pool = 'excluded';
  const status = decision.effective_status || decision.status;
  if (['On hold', 'Closed'].includes(status)) pool = status === 'Closed' ? 'closed' : 'hold';
  if (!['closed', 'hold'].includes(pool) && (decision.rejection_reference_ids?.length || decision.removed_reference_ids?.length)) pool = 'excluded';
  if (['withdrawn', 'sold', 'removed', 'unavailable'].includes(property.availability)) pool = 'inactive';
  return {
    pool,
    geographyExcluded,
    geographyExclusionReason: geographyExcluded ? 'Outside current search: Veneto and Valle d’Aosta excluded by Peter on 28 October 2026.' : '',
    band: !known ? 'Price unverified' : gatedFromRanking ? 'Price watch — strong case not established' : price <= 200000 ? 'Target budget' : price <= 225000 ? 'Above target' : price <= 260000 ? 'Stretch: strong case required' : 'Price watch',
    reductionToTarget: known ? Math.max(0, price - 200000) : null,
    reductionToCeiling: known ? Math.max(0, price - 260000) : null,
    requiresStrongCase: known && price > 225000 && price <= 260000,
  };
}

export function rank(rows) {
  rows = rows.map(r => ({ ...r, data: normalizeGeography(r.data) }));
  // Adapt stored spreadsheet rows too, so older imports open without rewriting history.
  const properties = rows.map(r => ({ ...r.data, dossier: normalizeDossier(r.data.dossier), status: r.status || 'Open', favourite: r.favourite || false, revision: r.revision || 0, commentCount: Number(r.comment_count || 0), importedAt: r.imported_at, rejectionReferenceIds: r.rejection_reference_ids || [], rejected: !!r.rejection_reference_ids?.length, referenceRejected: !!r.rejection_reference_ids?.length, referenceRemoved: !!r.removed_reference_ids?.length, jointRejectionReferenceIds: r.joint_rejection_reference_ids || [], jointlyRejected: !!r.joint_rejection_reference_ids?.length, removedFromSharedList: !!r.removed_reference_ids?.length, removedReferenceIds: r.removed_reference_ids || [], ...budget(r.data, r), rank: null }));
  properties.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (b.components?.['Owner privacy /15'] ?? 0) - (a.components?.['Owner privacy /15'] ?? 0) || (b.components?.['B&B /14'] ?? 0) - (a.components?.['B&B /14'] ?? 0) || (a.price ?? Infinity) - (b.price ?? Infinity) || a.id.localeCompare(b.id));
  let position = 0;
  for (const p of properties) if (p.pool === 'ranked') p.rank = ++position;
  return properties;
}

export async function allProperties(db) {
  const properties = (await db.query(`SELECT p.*, first_seen.first_observed_at, d.status, d.favourite, d.revision,
    (SELECT count(*) FROM feedback_events e WHERE e.property_id=p.id AND e.comment<>'') AS comment_count
    FROM properties p LEFT JOIN decisions d ON d.property_id=p.id
    LEFT JOIN (SELECT property_id,min(observed_at) AS first_observed_at FROM property_snapshots GROUP BY property_id) first_seen ON first_seen.property_id=p.id`)).rows;
  const references = (await db.query(`SELECT r.*, first_seen.first_observed_at FROM reference_homes r
    LEFT JOIN (SELECT reference_id,min(observed_at) AS first_observed_at FROM reference_membership_events WHERE listed=true GROUP BY reference_id) first_seen ON first_seen.reference_id=r.id`)).rows;
  const votes = (await db.query('SELECT * FROM reference_decisions')).rows;
  return rank(collectionRows(properties, references, votes));
}

export async function importProperties(db, payload) {
  const ids = new Set();
  for (const p of payload.properties) {
    if (ids.has(p.id)) throw Object.assign(new Error('Duplicate property ID in import.'), { status: 400 });
    ids.add(p.id);
  }
  return db.transaction(async tx => {
    await tx.query('SELECT pg_advisory_xact_lock(742002)');
    const prior = await tx.query('SELECT manifest_hash FROM import_runs WHERE source_revision=$1', [payload.sourceRevision]);
    const hash = digest(payload);
    if (prior.rows.length) {
      if (prior.rows[0].manifest_hash !== hash) throw Object.assign(new Error('This source revision was already imported with different content. Use a new revision.'), { status: 409 });
      return { imported: 0, unchanged: payload.properties.length, repeated: true };
    }
    let imported = 0;
    for (const incoming of payload.properties) {
      const current = await tx.query('SELECT data, content_hash FROM properties WHERE id=$1 FOR UPDATE', [incoming.id]);
      // Sparse refreshes may not erase previously retained facts, source aliases, or history.
      const p = { ...(current.rows[0]?.data || {}), ...incoming };
      p.firstSeenAt = earliestListingDay(current.rows[0]?.data.firstSeenAt, incoming.firstSeenAt, payload.observedAt);
      if (p.dossier !== undefined) p.dossier = normalizeDossier(p.dossier);
      // A failed image fetch is not evidence that previously saved photos vanished.
      // Keep their metadata aligned with the durable media bytes on sparse refreshes.
      if ((!Array.isArray(incoming.photos) || incoming.photos.length === 0) && current.rows[0]?.data.photos?.length) {
        p.photos = current.rows[0].data.photos;
      }
      if (current.rows[0]?.data.sources) {
        const sources = new Map();
        for (const s of [...current.rows[0].data.sources, ...(incoming.sources || [])]) sources.set(JSON.stringify(s), s);
        p.sources = [...sources.values()];
      }
      const contentHash = digest(p);
      if (current.rows[0]?.content_hash === contentHash) continue;
      await tx.query(`INSERT INTO properties(id,data,content_hash) VALUES($1,$2,$3)
        ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,content_hash=EXCLUDED.content_hash,imported_at=now()`, [p.id, JSON.stringify(p), contentHash]);
      await tx.query(`INSERT INTO property_snapshots(property_id,source_revision,observed_at,data,content_hash) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT DO NOTHING`, [p.id, payload.sourceRevision, payload.observedAt, JSON.stringify(p), contentHash]);
      imported++;
    }
    // Reference snapshots have their own revision guard; a concurrent register refresh cannot roll them back.
    for (const [key, value] of Object.entries(payload.meta || {}).filter(([key]) => key !== 'idealistaReferences')) await tx.query(`INSERT INTO project_meta(key,value) VALUES($1,$2)
      ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`, [key, JSON.stringify(value)]);
    await tx.query('INSERT INTO import_runs(source_revision,property_count,manifest_hash) VALUES($1,$2,$3)', [payload.sourceRevision, payload.properties.length, hash]);
    // Deliberately never update decisions, events, or delete absent properties.
    return { imported, unchanged: payload.properties.length - imported, repeated: false };
  });
}

