import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { randomUUID } from 'crypto'

type StoredAnnouncement = {
  id: string
  title?: string
  imageUrl: string
  startAt?: string | null
  endAt?: string | null
  hideHours?: number
  enabled?: boolean
  updatedAt?: string
}

const SETTING_KEY = 'announcement_popup_list'
const LEGACY_KEY = 'announcement_popup'
const MAX_HIDE_HOURS = 24 * 30 // 30 days

function clampHideHours(value: number | undefined | null) {
  if (!Number.isFinite(value)) return 24
  return Math.min(Math.max(Math.round(Number(value)), 0), MAX_HIDE_HOURS)
}

function safeDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function normalize(raw: Partial<StoredAnnouncement> | null | undefined, now: Date): StoredAnnouncement {
  const imageUrl = typeof raw?.imageUrl === 'string' ? raw.imageUrl : ''
  const enabledRaw = typeof raw?.enabled === 'boolean' ? raw.enabled : true
  const enabled = imageUrl ? enabledRaw : false
  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : randomUUID(),
    title: typeof raw?.title === 'string' && raw.title.trim() ? raw.title.trim() : 'ประกาศ',
    imageUrl,
    startAt: raw?.startAt ? safeDate(raw.startAt)?.toISOString() ?? null : null,
    endAt: raw?.endAt ? safeDate(raw.endAt)?.toISOString() ?? null : null,
    hideHours: clampHideHours(raw?.hideHours),
    enabled,
    updatedAt: raw?.updatedAt && safeDate(raw.updatedAt) ? new Date(raw.updatedAt).toISOString() : now.toISOString()
  }
}

function isActive(announcement: StoredAnnouncement | null, now: Date) {
  if (!announcement || !announcement.enabled) return false
  if (!announcement.imageUrl) return false

  const startAt = safeDate(announcement.startAt)
  const endAt = safeDate(announcement.endAt)

  const hasStarted = !startAt || startAt <= now
  const notEnded = !endAt || endAt >= now

  return hasStarted && notEnded
}

function getSettingsDelegate() {
  const prismaAny = prisma as unknown as { systemSettings?: typeof prisma.systemsettings; systemsettings?: typeof prisma.systemsettings }
  const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
  if (!systemSettings) {
    throw new Error('Prisma model delegate for SystemSettings not found')
  }
  return systemSettings
}

function parseStoredValue(value?: string | null) {
  if (!value) return { data: null, invalid: false }
  try {
    return { data: JSON.parse(value), invalid: false }
  } catch (err) {
    console.warn('announcement-popup: stored value is invalid JSON, ignoring previous value')
    return { data: null, invalid: true }
  }
}

export async function GET(req: Request) {
  const now = new Date()
  try {
    const url = new URL(req.url)
    const activeOnly = url.searchParams.get('activeOnly') === 'true'
    const systemSettings = getSettingsDelegate()

    const rows = await systemSettings.findMany({
      where: { key: { in: [SETTING_KEY, LEGACY_KEY] } }
    })

    const byKey = new Map(rows.map((r) => [r.key, r.value]))
    const parsedMain = parseStoredValue(byKey.get(SETTING_KEY))
    const parsedLegacy = parseStoredValue(byKey.get(LEGACY_KEY))
    const raw = parsedMain.data
    const legacy = parsedLegacy.data

    let list: StoredAnnouncement[] = []
    let shouldPersistMigration = false

    if (Array.isArray(raw)) {
      list = raw.map((item) => normalize(item, now))
      if (raw.some((item) => !item?.id)) {
        shouldPersistMigration = true
      }
      if (raw.some((item) => item?.enabled === true && !item?.imageUrl)) {
        shouldPersistMigration = true
      }
      if (raw.some((item) => !item?.updatedAt || !safeDate(item.updatedAt))) {
        shouldPersistMigration = true
      }
    } else if (raw && typeof raw === 'object') {
      list = [normalize(raw as Partial<StoredAnnouncement>, now)]
      shouldPersistMigration = true
    } else if (legacy) {
      list = [normalize(legacy as Partial<StoredAnnouncement>, now)]
      shouldPersistMigration = true
    }

    const activeList = list.filter((item) => isActive(item, now))
    const payload = activeOnly ? activeList : list

    // Auto-clean invalid JSON by resetting to empty list to prevent repeated warnings
    if (parsedMain.invalid) {
      await systemSettings.update({
        where: { key: SETTING_KEY },
        data: { value: JSON.stringify([]), updatedAt: now }
      }).catch(() => {})
    }
    if (parsedLegacy.invalid) {
      await systemSettings.update({
        where: { key: LEGACY_KEY },
        data: { value: JSON.stringify([]), updatedAt: now }
      }).catch(() => {})
    }

    if (shouldPersistMigration && list.length) {
      await systemSettings.upsert({
        where: { key: SETTING_KEY },
        update: { value: JSON.stringify(list), updatedAt: now },
        create: { id: randomUUID(), key: SETTING_KEY, value: JSON.stringify(list), updatedAt: now }
      }).catch(() => {})
    }

    return NextResponse.json({
      announcements: payload,
      active: activeList.length > 0,
      now: now.toISOString()
    })
  } catch (error) {
    console.error('Failed to read announcement popup:', error)
    return NextResponse.json({ announcements: [], active: false, now: now.toISOString() }, { status: 200 })
  }
}

export async function POST(req: Request) {
  const now = new Date()
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const systemSettings = getSettingsDelegate()
    const body = await req.json()

    const inputList: Partial<StoredAnnouncement>[] = Array.isArray(body?.announcements) ? body.announcements : []
    const normalized = inputList.map((item) => {
      const startAtIso = typeof item.startAt === 'string' && item.startAt.trim() ? new Date(item.startAt).toISOString() : null
      const endAtIso = typeof item.endAt === 'string' && item.endAt.trim() ? new Date(item.endAt).toISOString() : null

      if (startAtIso && endAtIso && new Date(endAtIso) < new Date(startAtIso)) {
        throw new Error('end_before_start')
      }

      return normalize(
        {
          ...item,
          startAt: startAtIso,
          endAt: endAtIso,
          updatedAt: now.toISOString(),
          id: item.id ?? randomUUID()
        },
        now
      )
    })

    await systemSettings.upsert({
      where: { key: SETTING_KEY },
      update: { value: JSON.stringify(normalized), updatedAt: now },
      create: { id: randomUUID(), key: SETTING_KEY, value: JSON.stringify(normalized), updatedAt: now }
    })

    return NextResponse.json({
      success: true,
      announcements: normalized,
      active: normalized.some((a) => isActive(a, now))
    })
  } catch (error) {
    if ((error as Error)?.message === 'end_before_start') {
      return NextResponse.json({ error: 'end_before_start' }, { status: 400 })
    }
    console.error('Failed to save announcement popup:', error)
    return NextResponse.json({ error: 'Failed to save announcement popup' }, { status: 500 })
  }
}
