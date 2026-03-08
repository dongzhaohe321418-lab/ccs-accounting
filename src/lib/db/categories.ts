import { getDb } from './index';
import type { Category } from '@/types';

export function getAllCategories(): Category[] {
  const db = getDb();
  return db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY type, id').all() as Category[];
}

export function getCategoriesByType(type: 'expense' | 'income'): Category[] {
  const db = getDb();
  return db.prepare('SELECT * FROM categories WHERE type = ? AND is_active = 1 ORDER BY id').all(type) as Category[];
}
