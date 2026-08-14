import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getLiveUser } from './admnUsersStore';
import { normalizeRole, type AdmnUserPublic } from './admnTypes';

export const ADMN_SESSION_COOKIE = 'admn_session';
const SESSION_DAYS = 14;

function sessionSecret(): Uint8Array {
  const secret = (process.env.ADMN_SESSION_SECRET || '').trim();
  if (!secret || secret.length < 16) {
    throw new Error('ADMN_SESSION_SECRET is missing or too short (min 16 chars).');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: AdmnUserPublic): Promise<string> {
  return new SignJWT({
    username: user.username,
    role: user.role,
    expiresAt: user.expiresAt ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(sessionSecret());
}

/**
 * Validates cookie JWT, then reloads the user from Cosmos so role/expiry
 * changes take effect without waiting for cookie expiry.
 */
export async function readSessionFromCookies(): Promise<AdmnUserPublic | null> {
  try {
    const jar = await cookies();
    const token = jar.get(ADMN_SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, sessionSecret());
    const username = String(payload.username || payload.sub || '').trim();
    if (!username) return null;
    const jwtRole = normalizeRole(payload.role);
    if (!jwtRole) return null;

    const live = await getLiveUser(username);
    if (!live) return null;
    return live;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;
