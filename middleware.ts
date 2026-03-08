import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register'];

// Cache JWT secret at module level for performance
let _cachedJwtSecret: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  if (_cachedJwtSecret) return _cachedJwtSecret;
  _cachedJwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
  return _cachedJwtSecret;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = request.cookies.get('ccs-session')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    // Use exact segment matching for admin paths to prevent false positives
    const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/') || pathname === '/api/admin';
    if (isAdminPath && payload.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '权限不足' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-user-id', String(payload.userId));
    response.headers.set('x-user-role', String(payload.role));
    return response;
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg).*)'],
};
