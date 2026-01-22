export function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || forwarded.trim()
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || undefined
}

