import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/seed', '/api/book', '/book', '/_next', '/favicon']

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', payload.tenantId as string)
    response.headers.set('x-tenant-slug', payload.tenantSlug as string)
    response.headers.set('x-user-id', payload.userId as string)
    response.headers.set('x-user-role', payload.role as string)
    response.headers.set('x-pathname', pathname)
    return response
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
