import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const reviewers = [{ id: 'peter', name: 'Peter' }, { id: 'rebecka', name: 'Rebecka' }];
const voteSchema = z.object({ requestId: z.uuid(), revision: z.number().int().nonnegative(), rejected: z.boolean(), reason: z.string().trim().max(2000).default('') }).strict();
const claimSchema = z.object({ claimId: z.uuid() }).strict();
const receiptSchema = claimSchema.extend({ messageId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/) }).strict();
const failureSchema = claimSchema.extend({ outcome: z.enum(['failed','unknown']), error: z.string().max(500) }).strict();
const bothReject = async (tx, id) => Number((await tx.query("SELECT count(*) AS n FROM reference_decisions WHERE reference_id=$1 AND user_id IN ('peter','rebecka') AND rejected", [id])).rows[0].n) === 2;

export async function referenceReviews(db) {
  const votes = (await db.query('SELECT * FROM reference_decisions ORDER BY reference_id,user_id')).rows;
  const emails = (await db.query('SELECT reference_id,state,sent_at FROM reference_removal_emails')).rows;
  return id => {
    const decisions = reviewers.map(user => {
      const vote = votes.find(v => v.reference_id === id && v.user_id === user.id);
      return { ...user, rejected: vote?.rejected || false, reason: vote?.reason || '', revision: vote?.revision || 0, updatedAt: vote?.updated_at || null };
    });
    const email = emails.find(e => e.reference_id === id);
    return { decisions, anyRejected: decisions.some(v => v.rejected), bothRejected: decisions.every(v => v.rejected), email: email ? { state: email.state, sentAt: email.sent_at } : null };
  };
}

async function queuedEmails(db) {
  const rows = (await db.query('SELECT e.*,h.data,h.listed FROM reference_removal_emails e JOIN reference_homes h ON h.id=e.reference_id ORDER BY e.created_at,e.id')).rows;
  const reviews = await referenceReviews(db);
  return rows.map(({ data, ...row }) => ({ ...row, eligible: reviews(row.reference_id).bothRejected, name: data.name, price: data.price,
    listingUrl: `https://www.idealista.it/immobile/${row.reference_id}/`, reviewPath: `/references/${row.reference_id}`,
    marker: `idealista-removal-${row.id}`, decisions: reviews(row.reference_id).decisions }));
}

export function installReferenceDecisions(app, { db, session, csrf, importer }) {
  app.post('/api/references/:id/decision', session, csrf, express.json({ limit: '16kb' }), async (req, res) => {
    if (!reviewers.some(u => u.id === req.user.id)) return res.status(403).json({ error: 'Only Peter and Rebecka can record these decisions.' });
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose your decision and a reason under 2,000 characters.' });
    const b = parsed.data;
    const result = await db.transaction(async tx => {
      if (!(await tx.query('SELECT id FROM reference_homes WHERE id=$1 FOR UPDATE', [req.params.id])).rows.length) return { status: 404, error: 'Saved home not found.' };
      const previous = (await tx.query('SELECT * FROM reference_decision_events WHERE request_id=$1', [b.requestId])).rows[0];
      if (previous) return previous.reference_id === req.params.id && previous.user_id === req.user.id && previous.rejected === b.rejected && previous.reason === b.reason && previous.revision === b.revision + 1 ? { saved: true, repeated: true } : { status: 409, error: 'Refresh before saving this decision.' };
      const current = (await tx.query('SELECT * FROM reference_decisions WHERE reference_id=$1 AND user_id=$2', [req.params.id, req.user.id])).rows[0];
      if ((current?.revision || 0) !== b.revision) return { status: 409, error: 'Your decision changed in another window. Reopen this review before saving again.' };
      await tx.query('INSERT INTO reference_decisions(reference_id,user_id,rejected,reason,revision) VALUES($1,$2,$3,$4,$5) ON CONFLICT(reference_id,user_id) DO UPDATE SET rejected=EXCLUDED.rejected,reason=EXCLUDED.reason,revision=EXCLUDED.revision,updated_at=now()', [req.params.id, req.user.id, b.rejected, b.reason, b.revision + 1]);
      await tx.query('INSERT INTO reference_decision_events(request_id,reference_id,user_id,rejected,reason,revision) VALUES($1,$2,$3,$4,$5,$6)', [b.requestId, req.params.id, req.user.id, b.rejected, b.reason, b.revision + 1]);
      if (await bothReject(tx, req.params.id)) {
        await tx.query("INSERT INTO reference_removal_emails(id,reference_id,state) VALUES($1,$2,'pending') ON CONFLICT(reference_id) DO UPDATE SET state='pending',last_error='',updated_at=now() WHERE reference_removal_emails.state='cancelled' AND reference_removal_emails.claim_id IS NULL AND reference_removal_emails.gmail_message_id IS NULL", [randomUUID(), req.params.id]);
      } else {
        await tx.query("UPDATE reference_removal_emails SET state='cancelled',updated_at=now() WHERE reference_id=$1 AND state='pending'", [req.params.id]);
      }
      return { saved: true };
    });
    res.status(result.status || 200).json(result);
  });

  // An authorized delivery task claims each email before calling Gmail. Ambiguous
  // outcomes stay held for receipt reconciliation; they are never blindly retried.
  app.get('/api/removal-emails', importer, async (req, res) => res.json({ emails: await queuedEmails(db) }));
  app.post('/api/removal-emails/:id/claim', importer, express.json({ limit: '4kb' }), async (req, res) => {
    const parsed = claimSchema.safeParse(req.body);
    if (!z.uuid().safeParse(req.params.id).success || !parsed.success) return res.status(400).json({ error: 'Invalid delivery claim.' });
    const result = await db.transaction(async tx => {
      const candidate = (await tx.query('SELECT reference_id FROM reference_removal_emails WHERE id=$1', [req.params.id])).rows[0];
      if (!candidate) return { status: 404, error: 'Email not found.' };
      await tx.query('SELECT id FROM reference_homes WHERE id=$1 FOR UPDATE', [candidate.reference_id]);
      const email = (await tx.query('SELECT * FROM reference_removal_emails WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
      if (!(await bothReject(tx, email.reference_id))) return { status: 409, error: 'Both people must still reject this property.' };
      if (email.state === 'sending' && email.claim_id === parsed.data.claimId) return { claimed: true, repeated: true };
      if (email.state !== 'pending') return { status: 409, error: 'This email has already been claimed, sent or cancelled.' };
      await tx.query("UPDATE reference_removal_emails SET state='sending',claim_id=$2,claimed_at=now(),updated_at=now() WHERE id=$1", [req.params.id, parsed.data.claimId]);
      return { claimed: true };
    });
    res.status(result.status || 200).json(result);
  });
  app.post('/api/removal-emails/:id/complete', importer, express.json({ limit: '4kb' }), async (req, res) => {
    const parsed = receiptSchema.safeParse(req.body);
    if (!z.uuid().safeParse(req.params.id).success || !parsed.success) return res.status(400).json({ error: 'A delivery claim and Gmail message ID are required.' });
    const r = await db.query("UPDATE reference_removal_emails SET state='sent',gmail_message_id=$3,sent_at=COALESCE(sent_at,now()),last_error='',updated_at=now() WHERE id=$1 AND claim_id=$2 AND (state IN ('sending','needs_check') OR (state='sent' AND gmail_message_id=$3)) RETURNING id", [req.params.id, parsed.data.claimId, parsed.data.messageId]);
    res.status(r.rows.length ? 200 : 409).json(r.rows.length ? { saved: true } : { error: 'This delivery claim is no longer valid.' });
  });
  app.post('/api/removal-emails/:id/failure', importer, express.json({ limit: '4kb' }), async (req, res) => {
    const parsed = failureSchema.safeParse(req.body);
    if (!z.uuid().safeParse(req.params.id).success || !parsed.success) return res.status(400).json({ error: 'Invalid delivery result.' });
    const b = parsed.data;
    const r = await db.query("UPDATE reference_removal_emails SET state=$3,claim_id=CASE WHEN $3='pending' THEN NULL ELSE claim_id END,last_error=$4,updated_at=now() WHERE id=$1 AND claim_id=$2 AND state IN ('sending','needs_check') RETURNING id", [req.params.id, b.claimId, b.outcome === 'failed' ? 'pending' : 'needs_check', b.error]);
    res.status(r.rows.length ? 200 : 409).json(r.rows.length ? { saved: true } : { error: 'This delivery claim is no longer valid.' });
  });
}

