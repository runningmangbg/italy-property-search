import { readFile } from 'node:fs/promises';

const [site, filename] = process.argv.slice(2);
if (!site || !filename || !process.env.IMPORT_TOKEN) throw new Error('Usage: IMPORT_TOKEN=… node scripts/import-handbook.mjs SITE_URL PRIVATE_BUNDLE');
const origin = new URL(site);
if (origin.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) throw new Error('Use HTTPS for hosted imports.');
const endpoint = new URL('/api/import/handbook', origin);
const headers = { Authorization: `Bearer ${process.env.IMPORT_TOKEN}`, 'Content-Type': 'application/json' };
async function request(options = {}) {
  const response = await fetch(endpoint, { headers, redirect: 'error', signal: AbortSignal.timeout(120000), ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Import failed (${response.status}).`);
  return result;
}
const bundle = JSON.parse(await readFile(filename, 'utf8'));
const current = (await request()).handbook;
bundle.expectedRevision = current?.sourceRevision || null;
console.log(JSON.stringify(await request({ method: 'POST', body: JSON.stringify(bundle) })));
