import { ensureDb } from './index';
import type { Reimbursement } from '@/types';
import type { Row } from '@libsql/client';

function rowToReimbursement(row: Row): Reimbursement {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    amount: Number(row.amount),
    category_id: Number(row.category_id),
    date: String(row.date),
    description: String(row.description),
    receipt_path: row.receipt_path ? String(row.receipt_path) : null,
    status: String(row.status),
    reviewed_by: row.reviewed_by ? Number(row.reviewed_by) : null,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    review_notes: row.review_notes ? String(row.review_notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    synced_at: row.synced_at ? String(row.synced_at) : null,
    sync_status: String(row.sync_status),
    user_name: row.user_name ? String(row.user_name) : undefined,
    category_name: row.category_name ? String(row.category_name) : undefined,
    reviewer_name: row.reviewer_name ? String(row.reviewer_name) : undefined,
  } as Reimbursement;
}

interface CreateReimbursementInput {
  userId: number;
  amount: number;
  categoryId: number;
  date: string;
  description: string;
  receiptPath?: string;
}

export async function createReimbursement(input: CreateReimbursementInput): Promise<Reimbursement> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: 'INSERT INTO reimbursements (user_id, amount, category_id, date, description, receipt_path) VALUES (?, ?, ?, ?, ?, ?)',
    args: [input.userId, input.amount, input.categoryId, input.date, input.description, input.receiptPath || null],
  });
  return (await getReimbursementById(Number(result.lastInsertRowid)))!;
}

export async function getReimbursementById(id: number): Promise<Reimbursement | undefined> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: `SELECT r.*, u.name as user_name, c.name as category_name, rv.name as reviewer_name
          FROM reimbursements r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN categories c ON r.category_id = c.id
          LEFT JOIN users rv ON r.reviewed_by = rv.id
          WHERE r.id = ?`,
    args: [id],
  });
  return result.rows.length > 0 ? rowToReimbursement(result.rows[0]) : undefined;
}

export async function listReimbursements(options: {
  userId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Reimbursement[]; total: number }> {
  const db = await ensureDb();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (options.userId) { conditions.push('r.user_id = ?'); args.push(options.userId); }
  if (options.status) { conditions.push('r.status = ?'); args.push(options.status); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM reimbursements r ${where}`, args });
  const total = Number(countResult.rows[0].c);

  const dataResult = await db.execute({
    sql: `SELECT r.*, u.name as user_name, c.name as category_name, rv.name as reviewer_name
          FROM reimbursements r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN categories c ON r.category_id = c.id
          LEFT JOIN users rv ON r.reviewed_by = rv.id
          ${where}
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return { data: dataResult.rows.map(rowToReimbursement), total };
}

export async function approveReimbursement(id: number, reviewerId: number, status: 'approved' | 'rejected', notes: string): Promise<Reimbursement | undefined> {
  const db = await ensureDb();
  await db.execute({
    sql: "UPDATE reimbursements SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?, updated_at = datetime('now'), sync_status = 'pending' WHERE id = ?",
    args: [status, reviewerId, notes, id],
  });
  return getReimbursementById(id);
}

export async function markReimbursementPaid(id: number): Promise<Reimbursement | undefined> {
  const db = await ensureDb();
  await db.execute({
    sql: "UPDATE reimbursements SET status = 'paid', updated_at = datetime('now'), sync_status = 'pending' WHERE id = ? AND status = 'approved'",
    args: [id],
  });
  return getReimbursementById(id);
}

export async function getPendingReimbursementsCount(): Promise<number> {
  const db = await ensureDb();
  const result = await db.execute("SELECT COUNT(*) as c FROM reimbursements WHERE status = 'pending'");
  return Number(result.rows[0].c);
}

export async function updateReimbursement(id: number, input: Partial<CreateReimbursementInput>): Promise<Reimbursement | undefined> {
  const db = await ensureDb();
  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.amount !== undefined) { fields.push('amount = ?'); args.push(input.amount); }
  if (input.categoryId !== undefined) { fields.push('category_id = ?'); args.push(input.categoryId); }
  if (input.date !== undefined) { fields.push('date = ?'); args.push(input.date); }
  if (input.description !== undefined) { fields.push('description = ?'); args.push(input.description); }
  if (input.receiptPath !== undefined) { fields.push('receipt_path = ?'); args.push(input.receiptPath); }

  if (fields.length === 0) return getReimbursementById(id);

  fields.push("updated_at = datetime('now')");
  fields.push('sync_status = ?');
  args.push('pending');
  args.push(id);

  await db.execute({ sql: `UPDATE reimbursements SET ${fields.join(', ')} WHERE id = ? AND status = 'pending'`, args });
  return getReimbursementById(id);
}

export async function getUnsyncedReimbursements(): Promise<Reimbursement[]> {
  const db = await ensureDb();
  const result = await db.execute(
    `SELECT r.*, u.name as user_name, c.name as category_name, rv.name as reviewer_name
     FROM reimbursements r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN categories c ON r.category_id = c.id
     LEFT JOIN users rv ON r.reviewed_by = rv.id
     WHERE r.sync_status != 'synced'`
  );
  return result.rows.map(rowToReimbursement);
}

export async function updateReimbursementSyncStatus(id: number, status: string, syncedAt?: string): Promise<void> {
  const db = await ensureDb();
  if (syncedAt) {
    await db.execute({ sql: 'UPDATE reimbursements SET sync_status = ?, synced_at = ? WHERE id = ?', args: [status, syncedAt, id] });
  } else {
    await db.execute({ sql: 'UPDATE reimbursements SET sync_status = ? WHERE id = ?', args: [status, id] });
  }
}

export async function getAllReimbursements(): Promise<Reimbursement[]> {
  const db = await ensureDb();
  const result = await db.execute(
    `SELECT r.*, u.name as user_name, c.name as category_name, rv.name as reviewer_name
     FROM reimbursements r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN categories c ON r.category_id = c.id
     LEFT JOIN users rv ON r.reviewed_by = rv.id
     ORDER BY r.created_at DESC`
  );
  return result.rows.map(rowToReimbursement);
}
