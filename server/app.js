import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allProperties, digest, importProperties } from './domain.js';
import { token, passwordMatches, sameSecret, hashPassword } from './auth.js';
import { installHandbook } from './handbook.js';
import { installReferences } from './references.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const pid = z.string().regex(/^(AB|MR|DL)\d{3,6}$/);
const propertySchema = z.object({ id: pid, name: z.string().min(1).max(500), price: z.number().nonnegative().nullable(), score: z.number().min(0).max(100).nullable(), region: z.enum(['Abruzzo', 'Marche', 'Dolomiti']), province: z.string().max(30) }).passthrough();
const importSchema = z.object({ sourceRevision: z.string().min(1).max(200), observedAt: z.iso.datetime({ offset: true }), properties: z.array(propertySchema).max(3000), meta: z.record(z.string(), z.unknown()).optional() }).refine(p => p.properties.length > 0 || Object.keys(p.meta || {}).some(key => key !== 'idealistaReferences'), 'An import must contain properties or project metadata.');
const decisionSchema = z.object({ requestId: z.uuid(), revision: z.number().int().nonnegative(), status: z.enum(['Open', 'Interested', 'On hold', 'Closed']), favourite: z.boolean(), comment: z.string().max(8000).default('') }).strict();

export function createApp({ db, users = [], importToken = '', production = false, devPreview = false }) {
  if (production && devPreview) throw new Error('Development preview must never run in production.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https://img1.idealista.it', 'https://img2.idealista.it', 'https://img3.idealista.it', 'https://img4.idealista.it'], connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"], upgradeInsecureRequests: production ? [] : null } }, crossOriginEmbedderPolicy: false, strictTransportSecurity: production ? undefined : false }));
  app.use((req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); next(); });
  app.use(['/api', '/handbook'], (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  app.get('/api/health', async (req, res) => {
    try { if (!db) throw new Error(); await db.query('SELECT 1'); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ status: 'setup_required' }); }
  });
  app.use(['/api', '/handbook'], (req, res, next) => db ? next() : res.status(503).json({ error: 'The property collection is being connected. Please try again shortly.' }));
  const cookieName = production ? '__Host-home_session' : 'home_session';
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/', maxAge: 30 * 86400000 };
  app.use(['/api', '/handbook'], async (req, res, next) => {
    if (devPreview) { req.user = { id: 'preview', name: 'Preview' }; req.csrf = 'preview'; return next(); }
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')));
    const value = cookies[cookieName];
    if (value && /^[A-Za-z0-9_-]{43}$/.test(value)) {
      const result = await db.query('SELECT * FROM sessions WHERE token_hash=$1 AND expires_at>now()', [digest(value)]);
      const session = result.rows[0];
      if (session && users.some(u => u.id === session.user_id)) { req.user = { id: session.user_id, name: session.user_name }; req.csrf = session.csrf; req.sessionHash = digest(value); }
    }
    next();
  });
  const json = express.json({ limit: '64kb' });
  const dummyHash = hashPassword(token());
  app.post('/api/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Please try again in 15 minutes.' } }), json, async (req, res) => {
    const input = z.object({ username: z.string().max(80), password: z.string().max(300) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: 'Enter your name and password.' });
    const user = users.find(u => u.id.toLowerCase() === input.data.username.toLowerCase().trim());
    const matches = await passwordMatches(input.data.password, user?.passwordHash || dummyHash);
    if (!user || !matches) return res.status(401).json({ error: 'The name or password is incorrect.' });
    const secret = token(), csrf = token();
    await db.transaction(async tx => {
      await tx.query('DELETE FROM sessions WHERE expires_at<now()');
      await tx.query('INSERT INTO sessions(token_hash,user_id,user_name,csrf,expires_at) VALUES($1,$2,$3,$4,$5)', [digest(secret), user.id, user.name, csrf, new Date(Date.now() + cookieOptions.maxAge)]);
    });
    res.cookie(cookieName, secret, cookieOptions).json({ user: { id: user.id, name: user.name }, csrf });
  });
  const session = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Please sign in to open your collection.' });
  const csrf = (req, res, next) => sameSecret(req.get('X-CSRF-Token'), req.csrf) ? next() : res.status(403).json({ error: 'Refresh the page before saving.' });
  const importer = (req, res, next) => sameSecret(req.get('Authorization'), `Bearer ${importToken}`) && importToken.length >= 32 ? next() : res.status(401).json({ error: 'Import authorization required.' });
  app.get('/api/session', session, (req, res) => res.json({ user: req.user, csrf: req.csrf }));
  app.post('/api/logout', session, csrf, async (req, res) => { if (req.sessionHash) await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]); res.clearCookie(cookieName, cookieOptions).json({ saved: true }); });
  app.get('/api/properties', session, async (req, res) => {
    const full = await allProperties(db);
    const properties = full.map(({ dossier, sources, costs, components, ...p }) => p);
    const meta = Object.fromEntries((await db.query('SELECT key,value FROM project_meta')).rows.map(r => [r.key, r.value]));
    // Raw source archives are operator exports, never a list-page payload.
    delete meta.sourceArchive;
    res.json({ properties, meta });
  });
  app.get('/api/properties/:id', session, async (req, res) => {
    const property = (await allProperties(db)).find(p => p.id === req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    const before = req.query.before === undefined ? null : Number(req.query.before);
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) return res.status(400).json({ error: 'Invalid history page.' });
    const args = before ? [property.id, before] : [property.id];
    const events = (await db.query(`SELECT id,revision,previous_status,status,favourite,comment,actor_name,created_at FROM feedback_events WHERE property_id=$1 ${before ? 'AND id<$2' : ''} ORDER BY id DESC LIMIT 51`, args)).rows;
    const snapshots = (await db.query('SELECT source_revision,observed_at,data->\'price\' AS price FROM property_snapshots WHERE property_id=$1 ORDER BY id DESC LIMIT 200', [property.id])).rows;
    res.json({ property, events: events.slice(0, 50), nextBefore: events.length > 50 ? events[49].id : null, snapshots });
  });
  app.post('/api/properties/:id/feedback', session, csrf, json, async (req, res) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose a valid status and a comment under 8,000 characters.' });
    const body = parsed.data;
    const result = await db.transaction(async tx => {
      const exists = await tx.query('SELECT id FROM properties WHERE id=$1', [req.params.id]);
      if (!exists.rows.length) return { status: 404, error: 'Property not found.' };
      await tx.query('INSERT INTO decisions(property_id) VALUES($1) ON CONFLICT DO NOTHING', [req.params.id]);
      const current = (await tx.query('SELECT * FROM decisions WHERE property_id=$1 FOR UPDATE', [req.params.id])).rows[0];
      const prior = (await tx.query('SELECT actor_id,property_id FROM feedback_events WHERE request_id=$1', [body.requestId])).rows[0];
      if (prior) return prior.actor_id === req.user.id && prior.property_id === req.params.id ? { saved: true, repeated: true } : { status: 409, error: 'Please refresh before saving.' };
      if (current.revision !== body.revision) return { status: 409, error: 'This property changed while you were reading. Review its latest status and save again. Your comment has been kept.' };
      if (current.status === body.status && current.favourite === body.favourite && !body.comment.trim()) return { status: 400, error: 'Add a comment or change a decision.' };
      await tx.query('INSERT INTO feedback_events(request_id,property_id,revision,previous_status,status,favourite,comment,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [body.requestId, req.params.id, current.revision + 1, current.status, body.status, body.favourite, body.comment.trim(), req.user.id, req.user.name]);
      await tx.query('UPDATE decisions SET status=$2,favourite=$3,revision=revision+1,updated_at=now(),updated_by=$4 WHERE property_id=$1', [req.params.id, body.status, body.favourite, req.user.name]);
      return { saved: true };
    });
    res.status(result.status || 200).json(result);
  });
  app.get('/api/media/:id/:index', session, async (req, res) => {
    const n = Number(req.params.index);
    if (!Number.isSafeInteger(n) || n < 0 || n > 30) return res.sendStatus(404);
    const r = (await db.query('SELECT mime_type,bytes FROM media WHERE property_id=$1 AND image_index=$2', [req.params.id, n])).rows[0];
    if (!r) return res.sendStatus(404);
    res.set('Cache-Control', 'private, max-age=3600').type(r.mime_type).send(Buffer.from(r.bytes));
  });
  app.post('/api/import', importer, express.json({ limit: '20mb' }), async (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid import manifest.', details: parsed.error.issues.slice(0, 10).map(i => ({ path: i.path, message: i.message })) });
    res.json(await importProperties(db, parsed.data));
  });
  app.put('/api/import/media/:id/:index', importer, express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '8mb' }), async (req, res) => {
    const n = Number(req.params.index);
    if (!pid.safeParse(req.params.id).success || !Number.isSafeInteger(n) || n < 0 || n > 30 || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'Invalid photo.' });
    const b = req.body, mime = req.get('Content-Type').split(';')[0];
    const valid = (mime === 'image/jpeg' && b[0] === 255 && b[1] === 216 && b[2] === 255) || (mime === 'image/png' && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) || (mime === 'image/webp' && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP');
    if (!valid) return res.status(400).json({ error: 'Photo type does not match its content.' });
    if (!(await db.query('SELECT id FROM properties WHERE id=$1', [req.params.id])).rows.length) return res.status(404).json({ error: 'Property not found.' });
    await db.query('INSERT INTO media(property_id,image_index,mime_type,bytes,content_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(property_id,image_index) DO UPDATE SET mime_type=EXCLUDED.mime_type,bytes=EXCLUDED.bytes,content_hash=EXCLUDED.content_hash', [req.params.id, n, mime, b, digest(b)]);
    res.json({ saved: true });
  });
  app.get('/api/export', importer, async (req, res) => {
    const result = {};
    for (const table of ['properties', 'decisions', 'feedback_events', 'property_snapshots', 'project_meta', 'import_runs', 'handbook_files', 'reference_homes', 'reference_notes', 'reference_decisions', 'reference_decision_events', 'reference_removal_emails']) result[table] = (await db.query(`SELECT * FROM ${table}`)).rows;
    result.exportedAt = new Date().toISOString();
    res.json(result);
  });
  app.get('/api/feedback-export', importer, async (req, res) => res.json({ decisions: (await db.query('SELECT * FROM decisions ORDER BY property_id')).rows, events: (await db.query('SELECT * FROM feedback_events ORDER BY id')).rows, referenceDecisions: (await db.query('SELECT * FROM reference_decisions ORDER BY reference_id,user_id')).rows, referenceEvents: (await db.query('SELECT * FROM reference_decision_events ORDER BY id')).rows }));
  installHandbook(app, { db, importer });
  installReferences(app, { db, session, csrf, importer });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use(express.static(path.join(root, 'public'), { dotfiles: 'deny', maxAge: 0 }));
  app.get(/^\/(?:properties\/(?:AB|MR|DL)\d+|(?:AB|MR|DL)\d+\.html)$/, (req, res) => res.sendFile(path.join(root, 'public/index.html')));
  app.get(/^\/references(?:\/\d{5,12})?\/?$/, (req, res) => res.sendFile(path.join(root, 'public/index.html')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (error.type === 'entity.too.large' ? 413 : 500);
    console.error('request_failed', { path: req.path, status, code: error.code || error.type || 'unknown' });
    res.status(status).json({ error: status < 500 ? error.message : 'Your request could not be completed. Please try again.' });
  });
  return app;
}
