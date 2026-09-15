// src/lib/cookie-consent.ts
//
// Plain client-side helpers for the cookie NOTICE banner only. This is
// deliberately separate from session-cookie.ts: that cookie is signed,
// httpOnly, and server-only (auth caching). This one is the opposite —
// unsigned, readable/writable from client JS — and holds nothing more
// sensitive than "has this browser already dismissed the notice."

const NOTICE_COOKIE_NAME = 'cookie_notice_dismissed';
const NOTICE_COOKIE_MAX_AGE_DAYS = 365;

export function hasSeenCookieNotice(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split('; ')
    .some((row) => row.startsWith(`${NOTICE_COOKIE_NAME}=`));
}

export function dismissCookieNotice() {
  const maxAge = NOTICE_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${NOTICE_COOKIE_NAME}=1; path=/; max-age=${maxAge}; samesite=lax`;
}