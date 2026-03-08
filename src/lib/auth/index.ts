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

// Cache the encoded JWT secret at module level to avoid
// creating a new TextEncoder on every call
let _cachedSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (_cachedSecret) return _cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  _cachedSecret = new TextEncoder().encode(secret);
  return _cachedSecret;
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
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
