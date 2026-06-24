'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, checkPassword, createSessionCookie } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export type LoginActionResult =
  | { error: true; kind?: 'wrong' }
  | { error: true; kind: 'throttled'; retryAfter: number };

export async function login(
  _prev: unknown,
  formData: FormData,
): Promise<LoginActionResult | void> {
  // x-forwarded-for is set by Vercel; on the dev server it's absent and we
  // fall back to a constant so localhost still gets throttled (useful when
  // running brute-force tests against the dev server).
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const limit = rateLimit(`login:${ip}`);
  if (!limit.ok) {
    return { error: true, kind: 'throttled', retryAfter: limit.retryAfter };
  }

  const password = String(formData.get('password') ?? '');
  if (!(await checkPassword(password))) {
    return { error: true };
  }
  (await cookies()).set(AUTH_COOKIE, await createSessionCookie(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8-hour session — aligns with a mine-site shift.
  });
  redirect('/');
}
