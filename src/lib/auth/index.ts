import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { AuthPayload } from '@/types';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}
