import { getDb } from './index';
import type { Reimbursement } from '@/types';

interface CreateReimbursementInput {
  userId: number;
  amount: number;
  categoryId: number;
  date: string;
  description: string;
  receiptPath?: string;
}

export function createReimbursement(input: CreateReimbursementInput): Reimbursement {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO reimbursements (user_id, amount, category_id, date, description, receipt_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.userId, input.amount, input.categoryId, input.date, input.description, input.receiptPath || null);
  return getReimbursementById(result.lastInsertRowid as number)!;
}

export function getReimbursementById(id: number): Reimbursement | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, u.name as user_name, c.name as category_name,
           rv.name as reviewer_name
    FROM reimbursements r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN users rv ON r.reviewed_by = rv.id
    WHERE r.id = ?
  `).get(id) as Reimbursement | undefined;
}

export function listReimbursements(options: {
  userId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}): { data: Reimbursement[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.userId) {
    conditions.push('r.user_id = ?');
    params.push(options.userId);
  }
  if (options.status) {
    conditions.push('r.status = ?');
    params.push(options.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const total = (db.prepare(`SELECT COUNT(*) as c FROM reimbursements r ${where}`).get(...params) as { c: number }).c;
  const data = db.prepare(`
    SELECT r.*, u.name as user_name, c.name as category_name,
           rv.name as reviewer_name
    FROM reimbursements r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN users rv ON r.reviewed_by = rv.id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Reimbursement[];

  return { data, total };
}

export function approveReimbursement(id: number, reviewerId: number, status: 'approved' | 'rejected', notes: string): Reimbursement | undefined {
  const db = getDb();
  db.prepare(`
    UPDATE reimbursements
    SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?,
        updated_at = datetime('now'), sync_status = 'pending'
    WHERE id = ?
  `).run(status, reviewerId, notes, id);
  return getReimbursementById(id);
}

export function markReimbursementPaid(id: number): Reimbursement | undefined {
  const db = getDb();
  db.prepare(`
    UPDATE reimbursements
    SET status = 'paid', updated_at = datetime('now'), sync_status = 'pending'
    WHERE id = ? AND status = 'approved'
  `).run(id);
  return getReimbursementById(id);
}

export function getPendingReimbursementsCount(): number {
  const db = getDb();
  const result = db.prepare("SELECT COUNT(*) as c FROM reimbursements WHERE status = 'pending'").get() as { c: number };
  return result.c;
}

export function updateReimbursement(id: number, input: Partial<CreateReimbursementInput>): Reimbursement | undefined {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.amount !== undefined) { fields.push('amount = ?'); params.push(input.amount); }
  if (input.categoryId !== undefined) { fields.push('category_id = ?'); params.push(input.categoryId); }
  if (input.date !== undefined) { fields.push('date = ?'); params.push(input.date); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description); }
  if (input.receiptPath !== undefined) { fields.push('receipt_path = ?'); params.push(input.receiptPath); }

  if (fields.length === 0) return getReimbursementById(id);

  fields.push(`updated_at = datetime('now')`);
  fields.push('sync_status = ?');
  params.push('pending');
  params.push(id);

  db.prepare(`UPDATE reimbursements SET ${fields.join(', ')} WHERE id = ? AND status = 'pending'`).run(...params);
  return getReimbursementById(id);
}

export function getUnsyncedReimbursements(): Reimbursement[] {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, u.name as user_name, c.name as category_name,
           rv.name as reviewer_name
    FROM reimbursements r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN users rv ON r.reviewed_by = rv.id
    WHERE r.sync_status != 'synced'
  `).all() as Reimbursement[];
}

export function updateReimbursementSyncStatus(id: number, status: string, syncedAt?: string): void {
  const db = getDb();
  if (syncedAt) {
    db.prepare('UPDATE reimbursements SET sync_status = ?, synced_at = ? WHERE id = ?').run(status, syncedAt, id);
  } else {
    db.prepare('UPDATE reimbursements SET sync_status = ? WHERE id = ?').run(status, id);
  }
}

export function getAllReimbursements(): Reimbursement[] {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, u.name as user_name, c.name as category_name,
           rv.name as reviewer_name
    FROM reimbursements r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN users rv ON r.reviewed_by = rv.id
    ORDER BY r.created_at DESC
  `).all() as Reimbursement[];
}
