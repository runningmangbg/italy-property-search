import { readFile } from 'node:fs/promises';

const [siteUrl, manifestPath] = process.argv.slice(2);
if (!siteUrl || !manifestPath || !process.env.IMPORT_TOKEN || !/^https:\/\//.test(siteUrl)) throw new Error('Usage: IMPORT_TOKEN=... node scripts/import-references.mjs https://SERVICE PRIVATE_MANIFEST');
const headers = { Authorization: `Bearer ${process.env.IMPORT_TOKEN}` };
const currentResponse = await fetch(`${siteUrl.replace(/\/$/, '')}/api/import/references`, { headers });
if (!currentResponse.ok) throw new Error(`Reference metadata read failed (${currentResponse.status}).`);
const current = await currentResponse.json();
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.expectedRevision = current.references?.sourceRevision || null;
const response = await fetch(`${siteUrl.replace(/\/$/, '')}/api/import/references`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(manifest) });
const result = await response.json();
if (!response.ok) throw new Error(`Reference import failed (${response.status}): ${result.error}`);
if (result.count !== manifest.homes.length) throw new Error('Imported reference count differs from the manifest.');
console.log(JSON.stringify({ count: result.count, sourceRevision: result.sourceRevision, repeated: result.repeated }));
