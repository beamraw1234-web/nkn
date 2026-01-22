import { headers } from 'next/headers'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendDiscordWebhook } from '@/lib/discord'

type GeoResult = {
  ip: string
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  isp?: string
  org?: string
}

function firstIpFromXForwardedFor(xff: string): string | null {
  const first = xff.split(',')[0]?.trim()
  if (!first) return null
  return first
}

export async function getRequestClientInfo() {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  const cf = h.get('cf-connecting-ip')
  const realIp = h.get('x-real-ip')
  const ip =
    (cf && cf.trim()) ||
    (realIp && realIp.trim()) ||
    (xff ? firstIpFromXForwardedFor(xff) : null) ||
    'unknown'

  const userAgent = h.get('user-agent') || 'unknown'

  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host')
  const baseUrl = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL || '')

  return { ip, userAgent, baseUrl }
}

function isProbablyPublicIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return false
  if (ip === '127.0.0.1' || ip === '::1') return false
  if (ip.startsWith('10.')) return false
  if (ip.startsWith('192.168.')) return false
  if (ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) return false
  return true
}

async function geoLookup(ip: string): Promise<GeoResult> {
  if (!isProbablyPublicIp(ip)) return { ip }

  // Keyless, coarse geolocation (country/region/city + lat/lon)
  // Provider: ipwho.is
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    const data = await res.json().catch(() => null) as {
      success?: boolean
      country?: string
      region?: string
      city?: string
      latitude?: number
      longitude?: number
      isp?: string
      org?: string
    } | null
    if (!data || data.success === false) return { ip }

    return {
      ip,
      country: data.country || undefined,
      region: data.region || undefined,
      city: data.city || undefined,
      latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
      longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
      isp: data.isp || undefined,
      org: data.org || undefined,
    }
  } catch {
    return { ip }
  } finally {
    clearTimeout(timeout)
  }
}

function mapLink(lat?: number, lon?: number): string | null {
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`
}

function formatLocation(geo: GeoResult): string {
  const parts = [geo.city, geo.region, geo.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'ไม่ทราบตำแหน่ง'
}

function shortenUserAgent(ua: string): string {
  if (!ua) return 'unknown'
  const trimmed = ua.trim()
  if (trimmed.length <= 180) return trimmed
  return `${trimmed.slice(0, 177)}...`
}

function uaHash(ua: string): string {
  try {
    return createHash('sha256').update(ua || '').digest('hex').slice(0, 12)
  } catch {
    return 'nohash'
  }
}

function minuteBucketKey(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}${mm}${dd}${hh}${mi}`
}

export async function sendLoginAlertForUser(params: { userId: string; username: string }) {
  // Web notifications are always created; Discord notifications remain optional via settings.
  let discordEnabled = false
  try {
    const systemSettings = (prisma as unknown as { systemSettings?: typeof prisma.systemsettings; systemsettings?: typeof prisma.systemsettings }).systemSettings
      ?? (prisma as unknown as { systemsettings?: typeof prisma.systemsettings }).systemsettings
    if (systemSettings) {
      const settings = (await systemSettings.findMany({
        where: { key: { in: ['discord_webhook_url', 'notify_on_login'] } },
      })) as Array<{ key: string; value: string | null }>

      const webhookUrl = settings.find((s) => s.key === 'discord_webhook_url')?.value
      const notifyEnabled = settings.find((s) => s.key === 'notify_on_login')?.value === 'true'
      discordEnabled = Boolean(webhookUrl) && notifyEnabled
    }
  } catch {
    discordEnabled = false
  }

  const { ip, userAgent, baseUrl } = await getRequestClientInfo()

  // Cleanup old login alerts (5-minute retention)
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    await prisma.notification.deleteMany({
      where: {
        userId: params.userId,
        type: 'LOGIN_ALERT',
        createdAt: { lt: fiveMinutesAgo },
      },
    })
  } catch {
    // best-effort
  }

  // Dedupe: avoid creating duplicated login alerts within the same minute bucket
  // for the same user+IP+UA. This also prevents multiple not-me tokens.
  const now = new Date()
  const dedupeKey = `LOGIN_ALERT:${ip}:${uaHash(userAgent)}:${minuteBucketKey(now)}`
  const existing = await prisma.notification.findFirst({
    where: { userId: params.userId, dedupeKey },
    select: { id: true },
  })
  if (existing) return

  const geo = await geoLookup(ip)

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const token = randomBytes(32).toString('hex')

  // Persist token so the Not-me action is one-time and expirable.
  await prisma.loginalerttoken.create({
    data: {
      id: randomUUID(),
      token,
      userId: params.userId,
      ip: geo.ip,
      userAgent: shortenUserAgent(userAgent),
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      expiresAt,
    },
  })

  const notMeUrl = baseUrl ? `${baseUrl}/login-alert/not-me?token=${encodeURIComponent(token)}` : ''
  const maps = mapLink(geo.latitude, geo.longitude)
  const loc = formatLocation(geo)
  const isp = geo.isp || geo.org

  const webMessageLines = [
    `IP: ${geo.ip}`,
    `ตำแหน่ง (จาก IP): ${loc}`,
    isp ? `เครือข่าย: ${isp}` : null,
    `อุปกรณ์: ${shortenUserAgent(userAgent)}`,
  ].filter(Boolean)

  try {
    await prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: params.userId,
        type: 'LOGIN_ALERT',
        title: 'มีการเข้าสู่ระบบใหม่',
        message: webMessageLines.join('\n'),
        dedupeKey,
        meta: {
          notMeToken: token,
          notMeUrl: notMeUrl || null,
          mapUrl: maps || null,
          ip: geo.ip,
          country: geo.country || null,
          region: geo.region || null,
          city: geo.city || null,
          latitude: geo.latitude ?? null,
          longitude: geo.longitude ?? null,
        },
      },
    })
  } catch (e) {
    const err = e as { code?: string }
    // If a race produced a duplicate (unique constraint), silently skip.
    if (err?.code === 'P2002') return
    throw e
  }

  const lines = [
    `✅ **${params.username}** เข้าสู่ระบบใหม่`,
    `• IP: **${geo.ip}**`,
    `• ตำแหน่ง (จาก IP): **${loc}**`,
    isp ? `• ผู้ให้บริการเครือข่าย: **${isp}**` : null,
    `• อุปกรณ์: ${shortenUserAgent(userAgent)}`,
    maps ? `• แผนที่: ${maps}` : null,
    notMeUrl ? `\nหาก **ไม่ใช่คุณ** ให้กดลิงก์นี้เพื่อบังคับเปลี่ยนรหัสผ่านทันที: ${notMeUrl}` : null,
  ].filter(Boolean)

  if (discordEnabled) {
    await sendDiscordWebhook(lines.join('\n'), 16753920)
  }
}
