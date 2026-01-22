import type { NextRequest } from 'next/server'

export function readAdminToken(req: Request | NextRequest) {
  const header =
    req.headers.get('x-admin-token') ||
    req.headers.get('X-ADMIN-TOKEN') ||
    req.headers.get('authorization') ||
    req.headers.get('Authorization') ||
    ''

  if (!header) return ''
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim()
  return header.trim()
}

export function requireAdminToken(req: Request | NextRequest) {
  const expected = String(process.env.ADMIN_TOKEN || '').trim()
  if (!expected) return false
  const token = readAdminToken(req)
  return token === expected
}

