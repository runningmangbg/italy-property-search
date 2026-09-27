import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [baseUrl, directory] = process.argv.slice(2);
if (!baseUrl || !directory || !process.env.IMPORT_TOKEN) throw new Error('Usage: IMPORT_TOKEN=... node scripts/import.mjs URL PRIVATE_BUNDLE_DIRECTORY');
const origin = new URL(baseUrl);
if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Remote imports require HTTPS.');
async function send(path, options) {
  const response = await fetch(new URL(path, origin), { ...options, headers: { Authorization: `Bearer ${process.env.IMPORT_TOKEN}`, ...options.headers } });
  if (!response.ok) throw new Error(`Import failed (${response.status}): ${await response.text()}`);
  return response.json();
}
const result = await send('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await readFile(`${directory}/properties.json`) });
console.log(result);
const media = JSON.parse(await readFile(`${directory}/media.json`, 'utf8'));
let done = 0;
// A small pool avoids overloading a free service. Each PUT is idempotent.
for (let offset=0; offset<media.length; offset+=4) {
  await Promise.all(media.slice(offset, offset+4).map(async item => {
    const bytes=await readFile(item.path);
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error(`Photo changed: ${item.id}`);
    const mime = bytes[0] === 255 ? 'image/jpeg' : bytes[0] === 137 ? 'image/png' : 'image/webp';
    await send(`/api/import/media/${item.id}/${item.index}`, { method: 'PUT', headers: { 'Content-Type': mime }, body: bytes }); done++;
  }));
  if (done % 40 === 0) console.log(`Photos imported: ${done}/${media.length}`);
}
console.log(`Complete: ${done} photos. Existing decisions and history were preserved.`);
