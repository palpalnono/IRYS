// Shared auth helpers — uses Web Crypto so the same module works in
// Node Server Actions and the Edge middleware runtime.

const COOKIE_NAME = 'irys_auth';

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error('AUTH_SECRET is missing or too short (need ≥32 chars). See .env.example.');
  }
  return s;
}

async function hmac(secret: string, value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time string comparison to avoid timing oracles on the signature.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionCookie(): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '');
  return `${token}.${await hmac(getSecret(), token)}`;
}

export async function verifySessionCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const token = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let expected: string;
  try {
    expected = await hmac(getSecret(), token);
  } catch {
    return false;
  }
  return timingSafeEqual(expected, sig);
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.IRYS_PASSWORD;
  if (!expected) return false;
  // Pad both sides so length equality doesn't leak.
  const a = input.padEnd(64, '\0').slice(0, 64);
  const b = expected.padEnd(64, '\0').slice(0, 64);
  return timingSafeEqual(a, b) && input.length === expected.length;
}

export const AUTH_COOKIE = COOKIE_NAME;
