import { once } from 'node:events';
import { allProperties } from './domain.js';

// Keep the existing export contract, including retained history. Never add
// sessions, credentials or image bytes to this operator JSON export.
export const EXPORT_TABLES = [
  'properties', 'decisions', 'feedback_events', 'property_snapshots',
  'project_meta', 'import_runs', 'handbook_files', 'reference_homes',
  'reference_notes', 'reference_decisions', 'reference_decision_events',
  'reference_removal_emails', 'reference_membership_events',
];
const BATCH_SIZE = 25;

// One export per application instance leaves pool/memory headroom for browsing
// and feedback. A competing automation can retry without starting another scan.
export function createExportHandler(db) {
  let exporting = false;
  return async (req, res, next) => {
    if (exporting) {
      res.set('Retry-After', '30');
      return res.status(503).json({ error: 'An export is already running. Please retry shortly.' });
    }
    exporting = true;
    const controller = new AbortController();
    const onClose = () => controller.abort();
    res.once('close', onClose);
    const write = async chunk => {
      controller.signal.throwIfAborted();
      if (!res.write(chunk)) await once(res, 'drain', { signal: controller.signal });
    };
    try {
      await db.transaction(async tx => {
        // All tables and the derived collection belong to the same point-in-time
        // snapshot even when an owner saves feedback during a long download.
        await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
        res.type('application/json');
        await write('{');
        for (const [index, table] of EXPORT_TABLES.entries()) {
          controller.signal.throwIfAborted();
          // Fixed allowlist only. Keep pg's existing timestamp/bigint conversion
          // and fetch only a bounded batch of historical dossiers at a time.
          await tx.query(`DECLARE property_export NO SCROLL CURSOR FOR SELECT * FROM ${table}`);
          await write(`${index ? ',' : ''}${JSON.stringify(table)}:[`);
          let first = true;
          while (true) {
            controller.signal.throwIfAborted();
            const { rows } = await tx.query(`FETCH FORWARD ${BATCH_SIZE} FROM property_export`);
            if (!rows.length) break;
            for (const row of rows) {
              await write(`${first ? '' : ','}${JSON.stringify(row)}`);
              first = false;
            }
          }
          await tx.query('CLOSE property_export');
          await write(']');
        }
        controller.signal.throwIfAborted();
        await write(',"collection":[');
        // Ranking/deduplication still needs the current collection in memory,
        // but its size no longer grows with the complete snapshot history.
        const collection = await allProperties(tx);
        for (const [index, property] of collection.entries()) {
          controller.signal.throwIfAborted();
          await write(`${index ? ',' : ''}${JSON.stringify(property)}`);
        }
        await write(']');
      });
      // Only a successfully completed transaction gets a valid JSON ending.
      // A failed/truncated download must never look like a complete export.
      controller.signal.throwIfAborted();
      res.end(`,"exportedAt":${JSON.stringify(new Date().toISOString())}}`);
    } catch (error) {
      if (res.headersSent) {
        if (!controller.signal.aborted) console.error('export_failed', { code: error.code || 'unknown' });
        res.destroy();
      } else if (!controller.signal.aborted) {
        next(error);
      }
    } finally {
      res.off('close', onClose);
      exporting = false;
    }
  };
}
