import { cookies } from 'next/headers';
import { verifyToken } from './index';
import type { AuthPayload } from '@/types';

const COOKIE_NAME = 'ccs-session';

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<AuthPayload> {
  const session = await getSession();
  if (!session) throw new Error('未登录');
  return session;
}

export async function requireAdmin(): Promise<AuthPayload> {
  const session = await requireAuth();
  if (session.role !== 'admin') throw new Error('权限不足');
  return session;
}
