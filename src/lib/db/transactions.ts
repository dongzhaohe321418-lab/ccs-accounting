import { getDb } from './index';
import type { Transaction } from '@/types';

interface CreateTransactionInput {
  userId: number;
  type: string;
  amount: number;
  categoryId: number;
  date: string;
  description: string;
  receiptPath?: string;
  reimbursementId?: number;
}

export function createTransaction(input: CreateTransactionInput): Transaction {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO transactions (user_id, type, amount, category_id, date, description, receipt_path, reimbursement_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.userId, input.type, input.amount, input.categoryId, input.date, input.description, input.receiptPath || null, input.reimbursementId || null);
  return getTransactionById(result.lastInsertRowid as number)!;
}

export function getTransactionById(id: number): Transaction | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, u.name as user_name, c.name as category_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).get(id) as Transaction | undefined;
}

export function listTransactions(options: {
  userId?: number;
  type?: string;
  limit?: number;
  offset?: number;
}): { data: Transaction[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.userId) {
    conditions.push('t.user_id = ?');
    params.push(options.userId);
  }
  if (options.type) {
    conditions.push('t.type = ?');
    params.push(options.type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const total = (db.prepare(`SELECT COUNT(*) as c FROM transactions t ${where}`).get(...params) as { c: number }).c;
  const data = db.prepare(`
    SELECT t.*, u.name as user_name, c.name as category_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN categories c ON t.category_id = c.id
    ${where}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Transaction[];

  return { data, total };
}

export function updateTransaction(id: number, input: Partial<CreateTransactionInput>): Transaction | undefined {
  const db = getDb();
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.type !== undefined) { fields.push('type = ?'); params.push(input.type); }
  if (input.amount !== undefined) { fields.push('amount = ?'); params.push(input.amount); }
  if (input.categoryId !== undefined) { fields.push('category_id = ?'); params.push(input.categoryId); }
  if (input.date !== undefined) { fields.push('date = ?'); params.push(input.date); }
  if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description); }
  if (input.receiptPath !== undefined) { fields.push('receipt_path = ?'); params.push(input.receiptPath); }

  if (fields.length === 0) return getTransactionById(id);

  fields.push(`updated_at = datetime('now')`);
  fields.push('sync_status = ?');
  params.push('pending');
  params.push(id);

  db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getTransactionById(id);
}

export function deleteTransaction(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function getTransactionStats(): { totalIncome: number; totalExpense: number } {
  const db = getDb();
  const income = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'").get() as { total: number }).total;
  const expense = (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'").get() as { total: number }).total;
  return { totalIncome: income, totalExpense: expense };
}

export function getRecentTransactions(limit: number = 5): Transaction[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, u.name as user_name, c.name as category_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.created_at DESC
    LIMIT ?
  `).all(limit) as Transaction[];
}

export function getUnsyncedTransactions(): Transaction[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, u.name as user_name, c.name as category_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.sync_status != 'synced'
  `).all() as Transaction[];
}

export function updateTransactionSyncStatus(id: number, status: string, syncedAt?: string): void {
  const db = getDb();
  if (syncedAt) {
    db.prepare('UPDATE transactions SET sync_status = ?, synced_at = ? WHERE id = ?').run(status, syncedAt, id);
  } else {
    db.prepare('UPDATE transactions SET sync_status = ? WHERE id = ?').run(status, id);
  }
}

export function getAllTransactions(): Transaction[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, u.name as user_name, c.name as category_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.created_at DESC
  `).all() as Transaction[];
}
