import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { createLog } from '@/lib/log'
import { randomUUID } from 'crypto'

type SystemSettingsDelegate = {
  findUnique: (args: unknown) => Promise<{ key: string; value: string } | null>
  upsert: (args: unknown) => Promise<unknown>
}

function getSettingsDelegate(): SystemSettingsDelegate {
  const prismaAny = prisma as unknown as { systemSettings?: SystemSettingsDelegate; systemsettings?: SystemSettingsDelegate }
  const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
  if (!systemSettings) throw new Error('Prisma model delegate for SystemSettings not found')
  return systemSettings
}

async function upsertSetting(systemSettings: SystemSettingsDelegate, key: string, value: string, now: Date) {
  return systemSettings.upsert({
    where: { key },
    update: { value, updatedAt: now },
    create: { id: randomUUID(), key, value, updatedAt: now }
  })
}

export async function GET() {
  try {
    const systemSettings = getSettingsDelegate()

    const devtoolsSetting = await systemSettings.findUnique({
      where: { key: 'disable_devtools' }
    })
    const logoSetting = await systemSettings.findUnique({
      where: { key: 'site_logo' }
    })
    const themeSetting = await systemSettings.findUnique({
      where: { key: 'system_theme' }
    })
    const discordWebhookSetting = await systemSettings.findUnique({
      where: { key: 'discord_webhook_url' }
    })
    const notifyLoginSetting = await systemSettings.findUnique({
      where: { key: 'notify_on_login' }
    })
    const maintenanceSetting = await systemSettings.findUnique({
      where: { key: 'maintenance_mode' }
    })
    const maintenanceMessageSetting = await systemSettings.findUnique({
      where: { key: 'maintenance_message' }
    })
    const maintenanceEndTimeSetting = await systemSettings.findUnique({
      where: { key: 'maintenance_end_time' }
    })
    const languageSetting = await systemSettings.findUnique({
      where: { key: 'system_language' }
    })
    const backgroundTypeSetting = await systemSettings.findUnique({
      where: { key: 'system_background_type' }
    })
    const backgroundValueSetting = await systemSettings.findUnique({
      where: { key: 'system_background_value' }
    })
    const backgroundColorSetting = await systemSettings.findUnique({
      where: { key: 'system_background_color' }
    })
    const backgroundGridColorSetting = await systemSettings.findUnique({
      where: { key: 'system_background_grid_color' }
    })
    const backgroundGridAlphaSetting = await systemSettings.findUnique({
      where: { key: 'system_background_grid_alpha' }
    })
    const backgroundGridAutoSetting = await systemSettings.findUnique({
      where: { key: 'system_background_grid_auto' }
    })
    const backgroundBlurSetting = await systemSettings.findUnique({
      where: { key: 'system_background_blur' }
    })
    const sessionTimeoutSetting = await systemSettings.findUnique({
      where: { key: 'session_timeout_minutes' }
    })
    const weatherEffectSetting = await systemSettings.findUnique({
      where: { key: 'weather_effect' }
    })
    const weatherSpeedSetting = await systemSettings.findUnique({
      where: { key: 'weather_speed' }
    })
    const weatherColorSetting = await systemSettings.findUnique({
      where: { key: 'weather_color' }
    })

    const omiseEnabledSetting = await systemSettings.findUnique({ where: { key: 'omise_promptpay_enabled' } })
    const omiseSecretKeySetting = await systemSettings.findUnique({ where: { key: 'omise_secret_key' } })
    const omisePublicKeySetting = await systemSettings.findUnique({ where: { key: 'omise_public_key' } })
    const omiseVersionSetting = await systemSettings.findUnique({ where: { key: 'omise_api_version' } })
    const omiseCurrencySetting = await systemSettings.findUnique({ where: { key: 'omise_currency' } })
    const omiseAmountSetting = await systemSettings.findUnique({ where: { key: 'omise_promptpay_amount_satang' } })

    const hasOmiseSecretKey = Boolean(omiseSecretKeySetting?.value?.trim())
    const masked = hasOmiseSecretKey ? `${omiseSecretKeySetting!.value.slice(0, 8)}••••••••` : ''

    return NextResponse.json({
      enabled: devtoolsSetting ? devtoolsSetting.value === 'true' : true,
      logoUrl: logoSetting?.value || '',
      theme: themeSetting?.value || 'light',
      discordWebhookUrl: discordWebhookSetting?.value || '',
      notifyOnLogin: notifyLoginSetting?.value === 'true',
      maintenanceMode: maintenanceSetting?.value === 'true',
      maintenanceMessage: maintenanceMessageSetting?.value || '',
      maintenanceEndTime: maintenanceEndTimeSetting?.value || '',
      language: languageSetting?.value || 'th',
      backgroundType: backgroundTypeSetting?.value || 'grid',
      backgroundValue: backgroundValueSetting?.value || ''
      ,
      backgroundColor: backgroundColorSetting?.value || '',
      backgroundGridColor: backgroundGridColorSetting?.value || '',
      backgroundGridAlpha: backgroundGridAlphaSetting?.value || '',
      backgroundGridAuto: backgroundGridAutoSetting ? backgroundGridAutoSetting.value === 'true' : true,
      backgroundBlur: backgroundBlurSetting?.value || '0',
      sessionTimeoutMinutes: sessionTimeoutSetting ? parseInt(sessionTimeoutSetting.value) : 60,
      weatherEffect: weatherEffectSetting?.value || 'none',
      weatherSpeed: weatherSpeedSetting ? parseFloat(weatherSpeedSetting.value) : 1,
      weatherColor: weatherColorSetting?.value || '#ffffff',
      omiseEnabled: omiseEnabledSetting ? omiseEnabledSetting.value === 'true' : true,
      omiseHasSecretKey: hasOmiseSecretKey,
      omiseSecretKeyMasked: masked,
      omisePublicKey: omisePublicKeySetting?.value || '',
      omiseApiVersion: omiseVersionSetting?.value || '2019-05-29',
      omiseCurrency: omiseCurrencySetting?.value || 'thb',
      omiseDefaultAmountSatang: omiseAmountSetting?.value || '1000'
    })
  } catch (error) {
    console.error('GET /api/settings failed:', (error as any)?.message ?? error)
    console.debug('GET /api/settings stack:', (error as any)?.stack ?? 'no-stack')
    return NextResponse.json({
      enabled: true,
      logoUrl: '',
      theme: 'light',
      discordWebhookUrl: '',
      notifyOnLogin: false,
      maintenanceMode: false,
      maintenanceMessage: '',
      maintenanceEndTime: '',
      language: 'th',
      backgroundType: 'grid',
      backgroundValue: ''
      ,
      backgroundColor: '',
      backgroundGridColor: '',
      backgroundGridAlpha: '',
      backgroundGridAuto: true,
      backgroundBlur: '0'
    }, { status: 200 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const systemSettings = getSettingsDelegate()
    const now = new Date()

    // Handle Security Setting
    if (typeof body.enabled !== 'undefined') {
      await upsertSetting(systemSettings, 'disable_devtools', String(body.enabled), now)

      await createLog(
        session.user.name || 'Admin',
        'แก้ไขการตั้งค่า',
        'ADMIN',
        `เปลี่ยนสถานะระบบป้องกัน (F12) เป็น ${body.enabled ? 'เปิด' : 'ปิด'}`,
        session.user.id
      )
    }

  // Handle Logo Setting
  if (typeof body.logoUrl !== 'undefined') {
    await upsertSetting(systemSettings, 'site_logo', String(body.logoUrl), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      'เปลี่ยนโลโก้เว็บไซต์',
      session.user.id
    )
  }

  // Handle Theme Setting
  if (typeof body.theme !== 'undefined') {
    await upsertSetting(systemSettings, 'system_theme', String(body.theme), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนธีมระบบเป็น ${body.theme}`,
      session.user.id
    )
  }

  // Handle Discord Webhook
  if (typeof body.discordWebhookUrl !== 'undefined') {
    await upsertSetting(systemSettings, 'discord_webhook_url', String(body.discordWebhookUrl), now)
  }

  // Handle Notify on Login
  if (typeof body.notifyOnLogin !== 'undefined') {
    await upsertSetting(systemSettings, 'notify_on_login', String(body.notifyOnLogin), now)
  }

  // Handle Maintenance Mode
  if (typeof body.maintenanceMode !== 'undefined') {
    await upsertSetting(systemSettings, 'maintenance_mode', String(body.maintenanceMode), now)

    // Handle Maintenance Message
    if (typeof body.maintenanceMessage !== 'undefined') {
      await upsertSetting(systemSettings, 'maintenance_message', String(body.maintenanceMessage), now)
    }

    // Handle Maintenance End Time
    if (typeof body.maintenanceEndTime !== 'undefined') {
      await upsertSetting(systemSettings, 'maintenance_end_time', String(body.maintenanceEndTime), now)
    }

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนสถานะโหมดปิดปรับปรุงเป็น ${body.maintenanceMode ? 'เปิด' : 'ปิด'}`,
      session.user.id
    )
  }

  // Handle Language Setting
  if (typeof body.language !== 'undefined') {
    await upsertSetting(systemSettings, 'system_language', String(body.language), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนภาษาของระบบเป็น ${body.language}`,
      session.user.id
    )
  }

  // Handle Background Setting
  if (typeof body.backgroundType !== 'undefined') {
    await upsertSetting(systemSettings, 'system_background_type', String(body.backgroundType), now)

    if (typeof body.backgroundValue !== 'undefined') {
      await upsertSetting(systemSettings, 'system_background_value', String(body.backgroundValue), now)
    }

    if (typeof body.backgroundColor !== 'undefined') {
      await upsertSetting(systemSettings, 'system_background_color', String(body.backgroundColor), now)
    }

    if (typeof body.backgroundGridColor !== 'undefined') {
      await upsertSetting(systemSettings, 'system_background_grid_color', String(body.backgroundGridColor), now)
    }

    if (typeof body.backgroundGridAlpha !== 'undefined') {
      await upsertSetting(systemSettings, 'system_background_grid_alpha', String(body.backgroundGridAlpha), now)
    }

    if (typeof body.backgroundGridAuto !== 'undefined') {
      await upsertSetting(systemSettings, 'system_background_grid_auto', String(body.backgroundGridAuto), now)
    }

    if (typeof body.backgroundBlur !== 'undefined') {
      await upsertSetting(systemSettings, 'system_background_blur', String(body.backgroundBlur), now)
    }

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนพื้นหลังของระบบ`,
      session.user.id
    )
  }

  // Handle Session Timeout
  if (typeof body.sessionTimeoutMinutes !== 'undefined') {
    await upsertSetting(systemSettings, 'session_timeout_minutes', String(body.sessionTimeoutMinutes), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนเวลาหมดอายุเซสชันเป็น ${body.sessionTimeoutMinutes} นาที`,
      session.user.id
    )
  }

  // Handle Weather Effect
  if (typeof body.weatherEffect !== 'undefined') {
    await upsertSetting(systemSettings, 'weather_effect', String(body.weatherEffect), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนเอฟเฟกต์สภาพอากาศเป็น ${body.weatherEffect}`,
      session.user.id
    )
  }

  // Handle Weather Speed
  if (typeof body.weatherSpeed !== 'undefined') {
    await upsertSetting(systemSettings, 'weather_speed', String(body.weatherSpeed), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนความเร็วเอฟเฟกต์สภาพอากาศเป็น ${body.weatherSpeed}`,
      session.user.id
    )
  }

  // Handle Weather Color
  if (typeof body.weatherColor !== 'undefined') {
    await upsertSetting(systemSettings, 'weather_color', String(body.weatherColor), now)

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนสีเอฟเฟกต์สภาพอากาศเป็น ${body.weatherColor}`,
      session.user.id
    )
  }

  // Handle Omise PromptPay settings
  if (typeof body.omiseEnabled !== 'undefined') {
    await upsertSetting(systemSettings, 'omise_promptpay_enabled', String(Boolean(body.omiseEnabled)), now)
  }
  if (typeof body.omiseSecretKey !== 'undefined') {
    await upsertSetting(systemSettings, 'omise_secret_key', String(body.omiseSecretKey || '').trim(), now)
  }
  if (typeof body.omisePublicKey !== 'undefined') {
    await upsertSetting(systemSettings, 'omise_public_key', String(body.omisePublicKey || '').trim(), now)
  }
  if (typeof body.omiseApiVersion !== 'undefined') {
    await upsertSetting(systemSettings, 'omise_api_version', String(body.omiseApiVersion || '').trim() || '2019-05-29', now)
  }
  if (typeof body.omiseCurrency !== 'undefined') {
    await upsertSetting(systemSettings, 'omise_currency', String(body.omiseCurrency || '').trim() || 'thb', now)
  }
  if (typeof body.omiseDefaultAmountSatang !== 'undefined') {
    await upsertSetting(systemSettings, 'omise_promptpay_amount_satang', String(body.omiseDefaultAmountSatang || '').trim() || '1000', now)
  }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/settings failed:', (error as any)?.message ?? error)
    console.debug('PUT /api/settings stack:', (error as any)?.stack ?? 'no-stack')
    try {
      await createLog('System', 'ตั้งค่าล้มเหลว', 'ADMIN', `ข้อผิดพลาดในการอัปเดตการตั้งค่า: ${String(error)}`)
    } catch (e) {
      // ignore logging errors
    }
    return NextResponse.json({ error: String(error) || 'Unknown error' }, { status: 500 })
  }
}
