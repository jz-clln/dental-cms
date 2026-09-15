// src/lib/session-cookie.ts
//
// Signs and verifies a short-lived cookie that caches the answer to
// "does this user have an active staff row, and which clinic" — the
// thing middleware.ts used to re-fetch from Supabase on every single
// navigation. Built on `jose` because middleware runs on the Edge
// Runtime, which has no Node `crypto` module; jose uses Web Crypto
// (`crypto.subtle`) instead, so it works unmodified in both Edge
// (middleware) and Node (route handlers).
//
// SECURITY NOTE: this cookie is a CACHE, not a source of truth. It's
// httpOnly + signed (HS256), so it can't be read or forged by client JS
// or a user editing cookies in devtools — but it still needs a short
// TTL, because revoking a staff member doesn't retroactively invalidate
// a cookie that was already issued. STAFF_SESSION_TTL_SECONDS bounds how
// long a just-deactivated account can keep working.

import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'staff-session';
const STAFF_SESSION_TTL_SECONDS = 5 * 60; // 5 minutes — see security note above

function getSecretKey() {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      '[session-cookie] SESSION_COOKIE_SECRET is missing or too short. ' +
      'Set it to a random string of at least 32 characters, e.g. `openssl rand -base64 32`.'
    );
  }
  return new TextEncoder().encode(secret);
}

export interface StaffSessionClaims {
  /** Supabase auth user id this cache entry belongs to — checked on every
   *  read so a cookie can never be reused for a different logged-in user
   *  on a shared browser. */
  uid: string;
  /** staff.id */
  sid: string;
  /** staff.clinic_id */
  cid: string;
  /** staff.is_active */
  active: boolean;
}

export async function signStaffSession(claims: StaffSessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${STAFF_SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Returns the cached claims if the cookie is present, correctly signed,
 * unexpired, AND issued for the given Supabase auth user id. Returns null
 * for everything else (missing, tampered, expired, or a stale cookie left
 * from a different account on a shared browser) — callers treat null as
 * "no cache, go query the database," identical to the old behavior.
 */
export async function verifyStaffSession(
  token: string | undefined,
  expectedUid: string
): Promise<StaffSessionClaims | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const claims = payload as unknown as StaffSessionClaims;

    if (claims.uid !== expectedUid) return null;
    if (typeof claims.sid !== 'string' || typeof claims.cid !== 'string') return null;
    if (typeof claims.active !== 'boolean') return null;

    return claims;
  } catch {
    // Expired, malformed, or signature mismatch — all treated the same:
    // fall back to a fresh DB read. This is the routine, expected path
    // on TTL expiry, not an error worth logging.
    return null;
  }
}

export const STAFF_SESSION_COOKIE = {
  name: COOKIE_NAME,
  maxAge: STAFF_SESSION_TTL_SECONDS,
} as const;