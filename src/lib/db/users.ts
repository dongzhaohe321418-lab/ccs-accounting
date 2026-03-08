import { getDb } from './index';
import type { User } from '@/types';

export function getUserByEmail(email: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE email = ?').get(email) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  const db = getDb();
  return db.prepare('SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserPasswordHash(email: string): { id: number; password_hash: string; role: string; name: string } | undefined {
  const db = getDb();
  return db.prepare('SELECT id, password_hash, role, name FROM users WHERE email = ? AND is_active = 1').get(email) as { id: number; password_hash: string; role: string; name: string } | undefined;
}

export function createUser(email: string, passwordHash: string, name: string, role: string = 'member'): number {
  const db = getDb();
  const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(email, passwordHash, name, role);
  return result.lastInsertRowid as number;
}

export function getAllUsers(): User[] {
  const db = getDb();
  return db.prepare('SELECT id, email, name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC').all() as User[];
}

export function updateUserRole(id: number, role: string): void {
  const db = getDb();
  db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(role, id);
}

export function updateUserStatus(id: number, isActive: number): void {
  const db = getDb();
  db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(isActive, id);
}

export function updateUserPassword(id: number, passwordHash: string): void {
  const db = getDb();
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(passwordHash, id);
}

export function getUserCount(): number {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get() as { c: number };
  return result.c;
}
