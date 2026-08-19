import { NextResponse } from 'next/server';

const WINDOW_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
const visitors = new Map();

function clientAddress(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function limitFor(pathname, method) {
  // Every tenant (e.g. /api/pathways/analyse) exposes the same route shapes as
  // ProposalMonitor's own (/api/analyse) and needs the same limits - without
  // this, a prefixed tenant's routes would silently fall through to the much
  // more permissive default below, including the paid Gemini call in analyse.
  const normalised = pathname.replace(/^\/api\/[a-z0-9-]+\//, '/api/');
  if (normalised === '/api/analyse') return { limit: 8, window: WINDOW_MS };
  if (normalised === '/api/sources' && method !== 'GET') return { limit: 20, window: WINDOW_MS };
  if (normalised === '/api/download') return { limit: 20, window: WINDOW_MS };
  if (pathname === '/api/health') return { limit: 30, window: 60 * 1000 };
  return { limit: 120, window: 60 * 1000 };
}

function tooManyRequests(request) {
  const { limit, window } = limitFor(request.nextUrl.pathname, request.method);
  const key = `${clientAddress(request)}:${request.method}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const entry = visitors.get(key);
  const active = entry && now - entry.startedAt < window ? entry : { startedAt: now, count: 0 };
  active.count += 1;
  visitors.set(key, active);

  if (visitors.size > 10_000) {
    for (const [storedKey, stored] of visitors) if (now - stored.startedAt >= window) visitors.delete(storedKey);
  }

  return active.count > limit ? Math.max(1, Math.ceil((window - (now - active.startedAt)) / 1000)) : 0;
}

function secureHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

function firstHeaderValue(value) {
  return value?.split(',')[0]?.trim();
}

function isSameOriginRequest(request, origin) {
  try {
    const originUrl = new URL(origin);
    const host = firstHeaderValue(request.headers.get('x-forwarded-host'))
      || request.headers.get('host');
    const protocol = firstHeaderValue(request.headers.get('x-forwarded-proto'))
      || request.nextUrl.protocol.replace(/:$/, '');

    return Boolean(host)
      && originUrl.host === host
      && originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export function middleware(request) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return secureHeaders(NextResponse.next());

  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) return secureHeaders(NextResponse.json({ error: 'Request is too large.' }, { status: 413 }));

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && !isSameOriginRequest(request, origin)) {
      return secureHeaders(NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 }));
    }
  }

  const retryAfter = tooManyRequests(request);
  if (retryAfter) {
    const response = NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    response.headers.set('Retry-After', String(retryAfter));
    return secureHeaders(response);
  }

  return secureHeaders(NextResponse.next());
}

export const config = { matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'] };
