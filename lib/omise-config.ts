import { prisma } from '@/lib/prisma'

type SystemSettingsDelegate = {
  findMany: (args: unknown) => Promise<Array<{ key: string; value: string }>>
}

function getSettingsDelegate(): SystemSettingsDelegate {
  const prismaAny = prisma as unknown as { systemSettings?: SystemSettingsDelegate; systemsettings?: SystemSettingsDelegate }
  const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
  if (!systemSettings) throw new Error('Prisma model delegate for SystemSettings not found')
  return systemSettings
}

function readEnv(name: string): string | null {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : null
}

function parseBool(value: string | null | undefined, defaultValue: boolean) {
  if (typeof value !== 'string') return defaultValue
  const v = value.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return defaultValue
}

function parsePositiveInt(value: string | null | undefined, defaultValue: number) {
  if (typeof value !== 'string') return defaultValue
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n <= 0) return defaultValue
  return n
}

export type OmiseRuntimeConfig = {
  enabled: boolean
  secretKey: string | null
  publicKey: string | null
  omiseVersion: string
  currency: string
  defaultAmountSatang: number
}

export async function getOmiseRuntimeConfig(): Promise<OmiseRuntimeConfig> {
  const envSecret = readEnv('OMISE_SECRET_KEY')
  const envPublic = readEnv('OMISE_PUBLIC_KEY')
  const envVersion = readEnv('OMISE_API_VERSION')
  const envCurrency = readEnv('OMISE_CURRENCY')
  const envEnabled = readEnv('OMISE_PROMPTPAY_ENABLED')
  const envDefaultAmount = readEnv('OMISE_PROMPTPAY_AMOUNT_SATANG')

  const keys = [
    'omise_secret_key',
    'omise_public_key',
    'omise_api_version',
    'omise_currency',
    'omise_promptpay_enabled',
    'omise_promptpay_amount_satang'
  ]

  const systemSettings = getSettingsDelegate()
  const rows = await systemSettings.findMany({ where: { key: { in: keys } } })
  const byKey = new Map(rows.map((r) => [r.key, r.value]))

  const secretKey = envSecret ?? (byKey.get('omise_secret_key')?.trim() || null)
  const publicKey = envPublic ?? (byKey.get('omise_public_key')?.trim() || null)
  const omiseVersion = envVersion ?? (byKey.get('omise_api_version')?.trim() || '2019-05-29')
  const currency = (envCurrency ?? (byKey.get('omise_currency')?.trim() || 'thb')).toLowerCase()
  const defaultAmountSatang = parsePositiveInt(envDefaultAmount ?? byKey.get('omise_promptpay_amount_satang'), 1000)

  const enabledFlag = parseBool(envEnabled ?? byKey.get('omise_promptpay_enabled'), true)
  const enabled = Boolean(secretKey) && enabledFlag

  return { enabled, secretKey, publicKey, omiseVersion, currency, defaultAmountSatang }
}

