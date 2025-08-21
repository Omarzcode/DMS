import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl

  // Define protected routes
  const adminRoutes = ["/admin"]
  const preacherRoutes = ["/dashboard"]
  const protectedRoutes = [...adminRoutes, ...preacherRoutes]

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // If it's a protected route, we'll let the client-side AuthGuard handle it
  // This middleware is mainly for future enhancements like API route protection
  if (isProtectedRoute) {
    // You can add server-side auth checks here if needed
    // For now, we'll let the client-side handle it
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
