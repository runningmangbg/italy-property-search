import { z } from 'zod';
import express from 'express';
import { digest } from './domain.js';

const assetPath = /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:html|css)$/;
const schema = z.object({
  sourceRevision: z.string().min(1).max(200),
  expectedRevision: z.string().max(200).nullable().default(null),
  sourceDate: z.iso.date(),
  files: z.array(z.object({ path: z.string().regex(assetPath), content: z.string().min(1).max(1000000) }).strict()).min(2).max(500),
}).strict();

export function installHandbook(app, { db, importer }) {
  app.get('/api/import/handbook', importer, async (req, res) => {
    res.json({ handbook: (await db.query("SELECT value FROM project_meta WHERE key='handbook'")).rows[0]?.value || null });
  });
  app.post('/api/import/handbook', importer, express.json({ limit: '10mb' }), async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid handbook bundle.' });
    const input = parsed.data;
    const paths = new Set(input.files.map(f => f.path));
    if (paths.size !== input.files.length || !paths.has('index.html') || !paths.has('assets/handbook.css')) return res.status(400).json({ error: 'Supply one complete handbook with unique paths, its index and stylesheet.' });
    const files = [...input.files].sort((a, b) => a.path.localeCompare(b.path));
    const hash = digest(JSON.stringify({ sourceDate: input.sourceDate, files }));
    const result = await db.transaction(async tx => {
      await tx.query("INSERT INTO project_meta(key,value) VALUES('handbook','null'::jsonb) ON CONFLICT DO NOTHING");
      const current = (await tx.query("SELECT value FROM project_meta WHERE key='handbook' FOR UPDATE")).rows[0].value;
      if (current?.sourceRevision === input.sourceRevision) {
        if (current.contentHash !== hash) throw Object.assign(new Error('This handbook revision already contains different content.'), { status: 409 });
        return { ...current, repeated: true };
      }
      if ((current?.sourceRevision || null) !== input.expectedRevision) throw Object.assign(new Error('The handbook changed. Read its current revision before importing again.'), { status: 409 });
      await tx.query('DELETE FROM handbook_files');
      for (const file of files) await tx.query('INSERT INTO handbook_files(path,content,content_hash) VALUES($1,$2,$3)', [file.path, file.content, digest(file.content)]);
      const summary = { sourceRevision: input.sourceRevision, sourceDate: input.sourceDate, fileCount: files.length, contentHash: hash, importedAt: new Date().toISOString() };
      await tx.query("UPDATE project_meta SET value=$1,updated_at=now() WHERE key='handbook'", [JSON.stringify(summary)]);
      return { ...summary, repeated: false };
    });
    res.json(result);
  });
  app.get(/^\/handbook(?:\/.*)?$/, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    if (!req.user) return res.redirect('/?next=' + encodeURIComponent(req.originalUrl));
    if (req.path === '/handbook') return res.redirect(308, '/handbook/');
    let requested;
    try { requested = decodeURIComponent(req.path.slice('/handbook/'.length)) || 'index.html'; }
    catch { return res.sendStatus(404); }
    if (!assetPath.test(requested)) return res.sendStatus(404);
    const file = (await db.query('SELECT content FROM handbook_files WHERE path=$1', [requested])).rows[0];
    if (!file) return res.status(404).type('html').send('<!doctype html><html lang="sv"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Handboken</title><h1>Sidan är inte tillgänglig ännu.</h1><p><a href="/">Tillbaka till husen</a></p></html>');
    res.set('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.type(requested.endsWith('.css') ? 'text/css' : 'text/html').send(file.content);
  });
}
