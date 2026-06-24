import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, verifySessionCookie } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifySessionCookie(cookie);
  const isLogin = request.nextUrl.pathname.startsWith('/login');

  if (!authed && !isLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (authed && isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (authed && request.nextUrl.pathname.startsWith('/station')) {
    return NextResponse.redirect(new URL('/fleet', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|intecs-logo\\.png).*)'],
};
