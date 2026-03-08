import { ensureDb } from './index';
import type { Category } from '@/types';

export async function getAllCategories(): Promise<Category[]> {
  const db = await ensureDb();
  const result = await db.execute('SELECT * FROM categories WHERE is_active = 1 ORDER BY type, id');
  return result.rows.map(row => ({
    id: Number(row.id),
    name: String(row.name),
    type: String(row.type),
    is_active: Number(row.is_active),
  })) as Category[];
}

export async function getCategoriesByType(type: 'expense' | 'income'): Promise<Category[]> {
  const db = await ensureDb();
  const result = await db.execute({ sql: 'SELECT * FROM categories WHERE type = ? AND is_active = 1 ORDER BY id', args: [type] });
  return result.rows.map(row => ({
    id: Number(row.id),
    name: String(row.name),
    type: String(row.type),
    is_active: Number(row.is_active),
  })) as Category[];
}
