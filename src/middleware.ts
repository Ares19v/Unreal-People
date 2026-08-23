import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware — runs before every request.
 * Generates a persistent session ID (UUID) if one doesn't exist.
 * This is the temporary user identity until Auth is implemented — 
 * when Auth lands, replace the cookie value with the real user ID.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get('up_session')) {
    const sessionId = crypto.randomUUID();
    response.cookies.set('up_session', sessionId, {
      httpOnly: true,       // Not accessible by JS (prevents tampering)
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365  // 1 year — survives browser restarts
    });
  }

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
