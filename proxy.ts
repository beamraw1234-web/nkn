import { NextResponse, NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { getPageAccess } from "@/lib/access-control"

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // Allow next internals and auth endpoints to pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  // Prevent recursion: allow internal middleware fetches to pass through
  if (req.headers.get('x-internal-fetch') === '1') {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not authenticated -> go to /login WITHOUT callbackUrl
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Global maintenance mode (read via internal API to avoid DB in Edge middleware)
  try {
    const settingsUrl = new URL('/api/settings', req.url).toString()
    const settingsRes = await fetch(settingsUrl, { headers: { 'x-internal-fetch': '1' } })
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      const isGlobalMaintenance = s?.maintenanceMode === true || s?.maintenanceMode === 'true'
      if (isGlobalMaintenance && (token as any).role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/maintenance', req.url))
      }
    }
  } catch (e) {
    console.error('proxy middleware: failed to read maintenance setting via internal fetch', e)
  }

  // If on /admin but not admin role -> redirect to /
  if (pathname.startsWith('/admin') && (token as any).role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check page access control
  const access = getPageAccess(pathname)

  if (access) {
    const userRole = (token as any).role
    const userId = (token as any).id || (token as any).sub

    // Admins can access everything
    if (userRole === 'ADMIN') {
      return NextResponse.next()
    }

    // Check maintenance mode - allow access if user is specifically allowed
    if (access.isMaintenance) {
      // If user is in allowedUsers list, allow access even during maintenance
      if (access.allowedUsers.length > 0 && access.allowedUsers.includes(userId)) {
        return NextResponse.next()
      }
      // Otherwise, redirect to maintenance
      return NextResponse.redirect(new URL(`/maintenance?page=${encodeURIComponent(pathname)}`, req.url))
    }

    // Check user access permissions for non-maintenance pages
    // For non-admin pages with empty allowedUsers, allow any authenticated user
    if (access.allowedUsers.length === 0 && !pathname.startsWith('/admin')) {
      return NextResponse.next()
    }

    // For pages with specific allowed users, check if current user is allowed
    if (access.allowedUsers.length > 0) {
      if (!access.allowedUsers.includes(userId)) {
        return NextResponse.redirect(new URL('/access-denied', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ["/", "/admin/:path*", "/profile", "/settings"] }
