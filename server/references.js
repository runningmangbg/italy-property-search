import express from 'express';
import { z } from 'zod';
import { digest } from './domain.js';
import { referenceReviews, installReferenceDecisions } from './reference-decisions.js';

const referenceId = z.string().regex(/^\d{5,12}$/);
const listingUrl = z.url().refine(v => /^https:\/\/www\.idealista\.it\/immobile\/\d{5,12}\/$/.test(v));
const text = z.string().max(3000);
const homeSchema = z.object({
  id: referenceId, name: z.string().min(1).max(500), url: listingUrl,
  price: z.number().positive().nullable(), region: z.string().max(80), province: z.string().max(80),
  position: z.number().int().nonnegative(), area: z.string().max(300), land: z.string().max(500),
  checkedAt: z.iso.datetime({ offset: true }).optional(),
  photo: z.object({ url: z.url().refine(v => /^https:\/\/img[1-4]\.idealista\.it\/.*image\.master\//.test(v)), alt: z.string().max(500) }).nullable(),
  matches: z.array(z.string().regex(/^(AB|MR|DL)\d{3,6}$/)).max(10),
  matchNote: text.default(''), duplicateOf: referenceId.nullable().default(null),
  assessment: z.object({
    verdict: z.enum(['outside-brief', 'concern', 'potential', 'needs-review']),
    summary: text, positives: z.array(text).max(12), questions: z.array(text).max(12),
    basis: z.enum(['Listing detail', 'Shared list']),
  }).strict(),
}).strict().refine(h => h.url === `https://www.idealista.it/immobile/${h.id}/`, 'Listing ID and URL must agree.');
const importSchema = z.object({
  sourceRevision: z.string().min(1).max(200), expectedRevision: z.string().max(200).nullable().default(null),
  observedAt: z.iso.datetime({ offset: true }), listName: z.string().min(1).max(200),
  sourceUrl: z.url().refine(v => /^https:\/\/www\.idealista\.it\/fav-list\/\d+\?/.test(v)),
  homes: z.array(homeSchema).min(1).max(3000),
}).strict();
const noteSchema = z.object({ requestId: z.uuid(), comment: z.string().trim().min(1).max(8000) }).strict();

export function installReferences(app, { db, session, csrf, importer }) {
  installReferenceDecisions(app, { db, session, csrf, importer });
  app.get('/api/references', session, async (req, res) => {
    const reviews = await referenceReviews(db);
    const homes = (await db.query('SELECT data,listed FROM reference_homes ORDER BY (data->>\'position\')::integer,id')).rows.map(r => ({ ...r.data, listed: r.listed, review: reviews(r.data.id) }));
    const meta = (await db.query("SELECT value FROM project_meta WHERE key='idealistaReferences'")).rows[0]?.value || null;
    res.json({ homes, meta });
  });
  app.get('/api/references/:id', session, async (req, res) => {
    const home = (await db.query('SELECT data,listed FROM reference_homes WHERE id=$1', [req.params.id])).rows[0];
    if (!home) return res.status(404).json({ error: 'Saved home not found.' });
    const before = req.query.before === undefined ? null : Number(req.query.before);
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) return res.status(400).json({ error: 'Invalid notes page.' });
    const notes = (await db.query(`SELECT id,comment,actor_name,created_at FROM reference_notes WHERE reference_id=$1 ${before ? 'AND id<$2' : ''} ORDER BY id DESC LIMIT 51`, before ? [req.params.id, before] : [req.params.id])).rows;
    const reviews = await referenceReviews(db);
    res.json({ home: { ...home.data, listed: home.listed, review: reviews(home.data.id) }, notes: notes.slice(0, 50), nextBefore: notes.length > 50 ? notes[49].id : null });
  });
  app.post('/api/references/:id/notes', session, csrf, express.json({ limit: '64kb' }), async (req, res) => {
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Write a note of up to 8,000 characters.' });
    if (!(await db.query('SELECT id FROM reference_homes WHERE id=$1', [req.params.id])).rows.length) return res.status(404).json({ error: 'Saved home not found.' });
    const body = parsed.data;
    const prior = (await db.query('INSERT INTO reference_notes(request_id,reference_id,comment,actor_id,actor_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT(request_id) DO NOTHING RETURNING id', [body.requestId, req.params.id, body.comment, req.user.id, req.user.name])).rows[0];
    if (!prior) {
      const repeat = (await db.query('SELECT reference_id,actor_id,comment FROM reference_notes WHERE request_id=$1', [body.requestId])).rows[0];
      if (repeat.reference_id !== req.params.id || repeat.actor_id !== req.user.id || repeat.comment !== body.comment) return res.status(409).json({ error: 'Please refresh before saving this note.' });
    }
    res.json({ saved: true, repeated: !prior });
  });
  app.get('/api/import/references', importer, async (req, res) => res.json({ references: (await db.query("SELECT value FROM project_meta WHERE key='idealistaReferences'")).rows[0]?.value || null }));
  app.post('/api/import/references', importer, express.json({ limit: '10mb' }), async (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid reference collection.', details: parsed.error.issues.slice(0, 8).map(i => ({ path: i.path, message: i.message })) });
    const input = parsed.data, ids = new Set(input.homes.map(h => h.id));
    if (ids.size !== input.homes.length || input.homes.some(h => h.duplicateOf && (!ids.has(h.duplicateOf) || h.duplicateOf === h.id))) return res.status(400).json({ error: 'Use unique listing IDs and valid duplicate links.' });
    const hash = digest({ observedAt: input.observedAt, listName: input.listName, sourceUrl: input.sourceUrl, homes: input.homes });
    const result = await db.transaction(async tx => {
      await tx.query("INSERT INTO project_meta(key,value) VALUES('idealistaReferences','null'::jsonb) ON CONFLICT DO NOTHING");
      const current = (await tx.query("SELECT value FROM project_meta WHERE key='idealistaReferences' FOR UPDATE")).rows[0].value;
      if (current?.sourceRevision === input.sourceRevision) {
        if (current.contentHash !== hash) throw Object.assign(new Error('This revision already contains different content.'), { status: 409 });
        return { ...current, repeated: true };
      }
      if ((current?.sourceRevision || null) !== input.expectedRevision) throw Object.assign(new Error('The reference collection changed. Read its current revision before importing.'), { status: 409 });
      const known = new Set((await tx.query('SELECT id FROM properties')).rows.map(r => r.id));
      if (input.homes.some(h => h.matches.some(id => !known.has(id)))) throw Object.assign(new Error('A linked dossier does not exist.'), { status: 400 });
      // Refresh source observations without touching either collection's personal decisions or notes.
      await tx.query('UPDATE reference_homes SET listed=false');
      for (const h of input.homes) await tx.query('INSERT INTO reference_homes(id,data,listed) VALUES($1,$2,true) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,listed=true,imported_at=now()', [h.id, JSON.stringify({ ...h, checkedAt: h.checkedAt || input.observedAt })]);
      const meta = { sourceRevision: input.sourceRevision, observedAt: input.observedAt, listName: input.listName, sourceUrl: input.sourceUrl, count: input.homes.length, contentHash: hash, importedAt: new Date().toISOString() };
      await tx.query("UPDATE project_meta SET value=$1,updated_at=now() WHERE key='idealistaReferences'", [JSON.stringify(meta)]);
      return { ...meta, repeated: false };
    });
    res.json(result);
  });
}
