import { ensureDb } from './index';
import type { Transaction } from '@/types';
import type { Row } from '@libsql/client';

function rowToTransaction(row: Row): Transaction {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    type: String(row.type),
    amount: Number(row.amount),
    category_id: Number(row.category_id),
    date: String(row.date),
    description: String(row.description),
    receipt_path: row.receipt_path ? String(row.receipt_path) : null,
    reimbursement_id: row.reimbursement_id ? Number(row.reimbursement_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    synced_at: row.synced_at ? String(row.synced_at) : null,
    sync_status: String(row.sync_status),
    user_name: row.user_name ? String(row.user_name) : undefined,
    category_name: row.category_name ? String(row.category_name) : undefined,
  } as Transaction;
}

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

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: 'INSERT INTO transactions (user_id, type, amount, category_id, date, description, receipt_path, reimbursement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [input.userId, input.type, input.amount, input.categoryId, input.date, input.description, input.receiptPath || null, input.reimbursementId || null],
  });
  return (await getTransactionById(Number(result.lastInsertRowid)))!;
}

export async function getTransactionById(id: number): Promise<Transaction | undefined> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: `SELECT t.*, u.name as user_name, c.name as category_name
          FROM transactions t
          LEFT JOIN users u ON t.user_id = u.id
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.id = ?`,
    args: [id],
  });
  return result.rows.length > 0 ? rowToTransaction(result.rows[0]) : undefined;
}

export async function listTransactions(options: {
  userId?: number;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Transaction[]; total: number }> {
  const db = await ensureDb();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (options.userId) { conditions.push('t.user_id = ?'); args.push(options.userId); }
  if (options.type) { conditions.push('t.type = ?'); args.push(options.type); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM transactions t ${where}`, args });
  const total = Number(countResult.rows[0].c);

  const dataResult = await db.execute({
    sql: `SELECT t.*, u.name as user_name, c.name as category_name
          FROM transactions t
          LEFT JOIN users u ON t.user_id = u.id
          LEFT JOIN categories c ON t.category_id = c.id
          ${where}
          ORDER BY t.date DESC, t.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return { data: dataResult.rows.map(rowToTransaction), total };
}

export async function updateTransaction(id: number, input: Partial<CreateTransactionInput>): Promise<Transaction | undefined> {
  const db = await ensureDb();
  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.type !== undefined) { fields.push('type = ?'); args.push(input.type); }
  if (input.amount !== undefined) { fields.push('amount = ?'); args.push(input.amount); }
  if (input.categoryId !== undefined) { fields.push('category_id = ?'); args.push(input.categoryId); }
  if (input.date !== undefined) { fields.push('date = ?'); args.push(input.date); }
  if (input.description !== undefined) { fields.push('description = ?'); args.push(input.description); }
  if (input.receiptPath !== undefined) { fields.push('receipt_path = ?'); args.push(input.receiptPath); }

  if (fields.length === 0) return getTransactionById(id);

  fields.push("updated_at = datetime('now')");
  fields.push('sync_status = ?');
  args.push('pending');
  args.push(id);

  await db.execute({ sql: `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, args });
  return getTransactionById(id);
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: 'DELETE FROM transactions WHERE id = ?', args: [id] });
}

export async function getTransactionStats(): Promise<{ totalIncome: number; totalExpense: number }> {
  const db = await ensureDb();
  const incomeResult = await db.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'");
  const expenseResult = await db.execute("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'");
  return { totalIncome: Number(incomeResult.rows[0].total), totalExpense: Number(expenseResult.rows[0].total) };
}

export async function getRecentTransactions(limit: number = 5): Promise<Transaction[]> {
  const db = await ensureDb();
  const result = await db.execute({
    sql: `SELECT t.*, u.name as user_name, c.name as category_name
          FROM transactions t
          LEFT JOIN users u ON t.user_id = u.id
          LEFT JOIN categories c ON t.category_id = c.id
          ORDER BY t.created_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows.map(rowToTransaction);
}

export async function getUnsyncedTransactions(): Promise<Transaction[]> {
  const db = await ensureDb();
  const result = await db.execute(
    `SELECT t.*, u.name as user_name, c.name as category_name
     FROM transactions t
     LEFT JOIN users u ON t.user_id = u.id
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.sync_status != 'synced'`
  );
  return result.rows.map(rowToTransaction);
}

export async function updateTransactionSyncStatus(id: number, status: string, syncedAt?: string): Promise<void> {
  const db = await ensureDb();
  if (syncedAt) {
    await db.execute({ sql: 'UPDATE transactions SET sync_status = ?, synced_at = ? WHERE id = ?', args: [status, syncedAt, id] });
  } else {
    await db.execute({ sql: 'UPDATE transactions SET sync_status = ? WHERE id = ?', args: [status, id] });
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await ensureDb();
  const result = await db.execute(
    `SELECT t.*, u.name as user_name, c.name as category_name
     FROM transactions t
     LEFT JOIN users u ON t.user_id = u.id
     LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC`
  );
  return result.rows.map(rowToTransaction);
}
