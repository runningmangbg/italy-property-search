import { Writable } from 'node:stream';
import { once } from 'node:events';
import { createExportHandler } from '../../server/export.js';

// Synthetic history bigger than this child's heap. The consumer deliberately
// yields between chunks so a missing backpressure check also fails this test.
const totalRows = 16384;
let table = '', offset = 0, peakHeap = 0, bytes = 0, suffix = '';
const db = { async transaction(fn) {
  return fn({ async query(sql) {
    if (sql.startsWith('DECLARE')) {
      table = sql.split(' ').at(-1);
      offset = 0;
    }
    if (sql.startsWith('FETCH') && table === 'property_snapshots') {
      const count = Math.min(25, totalRows - offset);
      const rows = Array.from({ length: count }, (_, i) => ({
        id: String(offset + i + 1), property_id: 'AB001',
        data: { description: 'x'.repeat(8192) },
      }));
      offset += count;
      return { rows };
    }
    return { rows: [] };
  } });
} };
const sink = new Writable({ highWaterMark: 16384, write(chunk, encoding, callback) {
  bytes += chunk.length;
  suffix = chunk.toString().slice(-100);
  peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
  setImmediate(callback);
} });
sink.type = () => sink;
const finished = once(sink, 'finish');
await createExportHandler(db)({}, sink, error => { throw error; });
await finished;
console.log(JSON.stringify({ bytes, peakHeap, peakRss: process.resourceUsage().maxRSS * 1024, suffix }));
