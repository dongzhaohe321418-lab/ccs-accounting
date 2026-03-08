import { ensureDb } from './index';
import type { User } from '@/types';
import type { Row } from '@libsql/client';

function rowToUser(row: Row): User {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    role: String(row.role),
    is_active: Number(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  } as User;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await ensureDb();
  const result = await db.execute({ sql: 'SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE email = ?', args: [email] });
  return result.rows.length > 0 ? rowToUser(result.rows[0]) : undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await ensureDb();
  const result = await db.execute({ sql: 'SELECT id, email, name, role, is_active, created_at, updated_at FROM users WHERE id = ?', args: [id] });
  return result.rows.length > 0 ? rowToUser(result.rows[0]) : undefined;
}

export async function getUserPasswordHash(email: string): Promise<{ id: number; password_hash: string; role: string; name: string } | undefined> {
  const db = await ensureDb();
  const result = await db.execute({ sql: 'SELECT id, password_hash, role, name FROM users WHERE email = ? AND is_active = 1', args: [email] });
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return { id: Number(row.id), password_hash: String(row.password_hash), role: String(row.role), name: String(row.name) };
}

export async function createUser(email: string, passwordHash: string, name: string, role: string = 'member'): Promise<number> {
  const db = await ensureDb();
  const result = await db.execute({ sql: 'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', args: [email, passwordHash, name, role] });
  return Number(result.lastInsertRowid);
}

export async function getAllUsers(): Promise<User[]> {
  const db = await ensureDb();
  const result = await db.execute('SELECT id, email, name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC');
  return result.rows.map(rowToUser);
}

export async function updateUserRole(id: number, role: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", args: [role, id] });
}

export async function updateUserStatus(id: number, isActive: number): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: "UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?", args: [isActive, id] });
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", args: [passwordHash, id] });
}

export async function getUserCount(): Promise<number> {
  const db = await ensureDb();
  const result = await db.execute('SELECT COUNT(*) as c FROM users WHERE is_active = 1');
  return Number(result.rows[0].c);
}
