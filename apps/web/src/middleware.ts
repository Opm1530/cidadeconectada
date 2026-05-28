import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import type { AuthUser } from '@cc/shared'

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!)

// Rotas que exigem autenticação e seus roles permitidos
const PROTECTED_ROUTES: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^\/dashboard/, roles: ['COMPANY_OWNER'] },
  { pattern: /^\/admin/, roles: ['CITY_ADMIN', 'SUPER_ADMIN'] },
  { pattern: /^\/superadmin/, roles: ['SUPER_ADMIN'] },
  { pattern: /^\/entregador/, roles: ['DELIVERY_DRIVER'] },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('cc_access')?.value

  // Verifica se a rota precisa de proteção
  const match = PROTECTED_ROUTES.find(({ pattern }) => pattern.test(pathname))
  if (!match) return NextResponse.next()

  // Sem token → redireciona para login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const { payload } = await jwtVerify(token, accessSecret)
    const user = payload.user as AuthUser

    // Role não autorizado → redireciona para home
    if (!match.roles.includes(user.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Injeta dados do user no header para uso nas route handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-role', user.role)
    requestHeaders.set('x-user-city', user.cityId ?? '')

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Token inválido/expirado → redireciona para login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('cc_access')
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/superadmin/:path*', '/entregador/:path*'],
}
