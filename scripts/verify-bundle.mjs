import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
const bundle=process.argv[2];
if (!bundle) throw new Error('Supply the private bundle directory.');
const pg=new PGlite();
await pg.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
const db={query:(...args)=>pg.query(...args),transaction:fn=>pg.transaction(fn)};
const secret='local-verification-import-token-32-characters';
const app=createApp({db,importToken:secret,devPreview:true});
const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;
try {
  const child=spawn(process.execPath,['scripts/import.mjs',origin,bundle],{stdio:'inherit',env:{...process.env,IMPORT_TOKEN:secret}});
  const [code]=await once(child,'exit'); assert.equal(code,0);
  const list=await (await fetch(origin+'/api/properties')).json();
  const manifest=JSON.parse(await readFile(bundle+'/properties.json','utf8'));
  assert.equal(list.properties.length,manifest.properties.length);
  let dossiers=0;
  for (const p of list.properties) {
    const original=manifest.properties.find(x=>x.id===p.id);
    assert.equal(p.score,original.score); assert.equal(p.price,original.price);
    if(p.price>260000) assert.equal(p.rank,null);
    const d=await (await fetch(origin+'/api/properties/'+p.id)).json();
    assert.equal(d.property.dossier.length,original.dossier.length); dossiers+=d.property.dossier.length;
  }
  const media=JSON.parse(await readFile(bundle+'/media.json','utf8'));
  const photoCount=(await db.query('SELECT count(*)::int AS n FROM media')).rows[0].n;
  assert.equal(photoCount,media.length);
  const authRequired=createApp({db});
  const summary={properties:list.properties.length,ranked:list.properties.filter(p=>p.pool==='ranked').length,priceWatch:list.properties.filter(p=>p.pool==='watch').length,photos:photoCount,dossierEvidenceRows:dossiers,validation:'passed'};
  console.log(JSON.stringify(summary));
} finally { await new Promise(resolve=>server.close(resolve)); await pg.close(); }
