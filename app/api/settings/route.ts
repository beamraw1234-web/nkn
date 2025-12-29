import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { createLog } from '@/lib/log'

export async function GET() {
  try {
    const devtoolsSetting = await prisma.systemSettings.findUnique({
      where: { key: 'disable_devtools' }
    })
    const logoSetting = await prisma.systemSettings.findUnique({
      where: { key: 'site_logo' }
    })
    const themeSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_theme' }
    })
    const discordWebhookSetting = await prisma.systemSettings.findUnique({
      where: { key: 'discord_webhook_url' }
    })
    const notifyLoginSetting = await prisma.systemSettings.findUnique({
      where: { key: 'notify_on_login' }
    })
    const maintenanceSetting = await prisma.systemSettings.findUnique({
      where: { key: 'maintenance_mode' }
    })
    const maintenanceMessageSetting = await prisma.systemSettings.findUnique({
      where: { key: 'maintenance_message' }
    })
    const maintenanceEndTimeSetting = await prisma.systemSettings.findUnique({
      where: { key: 'maintenance_end_time' }
    })
    const languageSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_language' }
    })
    const backgroundTypeSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_type' }
    })
    const backgroundValueSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_value' }
    })
    const backgroundColorSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_color' }
    })
    const backgroundGridColorSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_grid_color' }
    })
    const backgroundGridAlphaSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_grid_alpha' }
    })
    const backgroundGridAutoSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_grid_auto' }
    })
    const backgroundBlurSetting = await prisma.systemSettings.findUnique({
      where: { key: 'system_background_blur' }
    })
    const sessionTimeoutSetting = await prisma.systemSettings.findUnique({
      where: { key: 'session_timeout_minutes' }
    })
    const weatherEffectSetting = await prisma.systemSettings.findUnique({
      where: { key: 'weather_effect' }
    })
    const weatherSpeedSetting = await prisma.systemSettings.findUnique({
      where: { key: 'weather_speed' }
    })
    const weatherColorSetting = await prisma.systemSettings.findUnique({
      where: { key: 'weather_color' }
    })

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
      weatherColor: weatherColorSetting?.value || '#ffffff'
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

    // Handle Security Setting
    if (typeof body.enabled !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'disable_devtools' },
        update: { value: String(body.enabled) },
        create: { key: 'disable_devtools', value: String(body.enabled) }
      })

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
    await prisma.systemSettings.upsert({
      where: { key: 'site_logo' },
      update: { value: body.logoUrl },
      create: { key: 'site_logo', value: body.logoUrl }
    })

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
    await prisma.systemSettings.upsert({
      where: { key: 'system_theme' },
      update: { value: body.theme },
      create: { key: 'system_theme', value: body.theme }
    })

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
    await prisma.systemSettings.upsert({
      where: { key: 'discord_webhook_url' },
      update: { value: body.discordWebhookUrl },
      create: { key: 'discord_webhook_url', value: body.discordWebhookUrl }
    })
  }

  // Handle Notify on Login
  if (typeof body.notifyOnLogin !== 'undefined') {
    await prisma.systemSettings.upsert({
      where: { key: 'notify_on_login' },
      update: { value: String(body.notifyOnLogin) },
      create: { key: 'notify_on_login', value: String(body.notifyOnLogin) }
    })
  }

  // Handle Maintenance Mode
  if (typeof body.maintenanceMode !== 'undefined') {
    await prisma.systemSettings.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: String(body.maintenanceMode) },
      create: { key: 'maintenance_mode', value: String(body.maintenanceMode) }
    })

    // Handle Maintenance Message
    if (typeof body.maintenanceMessage !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'maintenance_message' },
        update: { value: body.maintenanceMessage },
        create: { key: 'maintenance_message', value: body.maintenanceMessage }
      })
    }

    // Handle Maintenance End Time
    if (typeof body.maintenanceEndTime !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'maintenance_end_time' },
        update: { value: body.maintenanceEndTime },
        create: { key: 'maintenance_end_time', value: body.maintenanceEndTime }
      })
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
    await prisma.systemSettings.upsert({
      where: { key: 'system_language' },
      update: { value: body.language },
      create: { key: 'system_language', value: body.language }
    })

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
    await prisma.systemSettings.upsert({
      where: { key: 'system_background_type' },
      update: { value: body.backgroundType },
      create: { key: 'system_background_type', value: body.backgroundType }
    })

    if (typeof body.backgroundValue !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'system_background_value' },
        update: { value: body.backgroundValue },
        create: { key: 'system_background_value', value: body.backgroundValue }
      })
    }

    if (typeof body.backgroundColor !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'system_background_color' },
        update: { value: body.backgroundColor },
        create: { key: 'system_background_color', value: body.backgroundColor }
      })
    }

    if (typeof body.backgroundGridColor !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'system_background_grid_color' },
        update: { value: body.backgroundGridColor },
        create: { key: 'system_background_grid_color', value: body.backgroundGridColor }
      })
    }

    if (typeof body.backgroundGridAlpha !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'system_background_grid_alpha' },
        update: { value: String(body.backgroundGridAlpha) },
        create: { key: 'system_background_grid_alpha', value: String(body.backgroundGridAlpha) }
      })
    }

    if (typeof body.backgroundGridAuto !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'system_background_grid_auto' },
        update: { value: String(body.backgroundGridAuto) },
        create: { key: 'system_background_grid_auto', value: String(body.backgroundGridAuto) }
      })
    }

    if (typeof body.backgroundBlur !== 'undefined') {
      await prisma.systemSettings.upsert({
        where: { key: 'system_background_blur' },
        update: { value: String(body.backgroundBlur) },
        create: { key: 'system_background_blur', value: String(body.backgroundBlur) }
      })
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
    await prisma.systemSettings.upsert({
      where: { key: 'session_timeout_minutes' },
      update: { value: String(body.sessionTimeoutMinutes) },
      create: { key: 'session_timeout_minutes', value: String(body.sessionTimeoutMinutes) }
    })

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
    await prisma.systemSettings.upsert({
      where: { key: 'weather_effect' },
      update: { value: body.weatherEffect },
      create: { key: 'weather_effect', value: body.weatherEffect }
    })

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
    await prisma.systemSettings.upsert({
      where: { key: 'weather_speed' },
      update: { value: String(body.weatherSpeed) },
      create: { key: 'weather_speed', value: String(body.weatherSpeed) }
    })

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
    await prisma.systemSettings.upsert({
      where: { key: 'weather_color' },
      update: { value: body.weatherColor },
      create: { key: 'weather_color', value: body.weatherColor }
    })

    await createLog(
      session.user.name || 'Admin',
      'แก้ไขการตั้งค่า',
      'ADMIN',
      `เปลี่ยนสีเอฟเฟกต์สภาพอากาศเป็น ${body.weatherColor}`,
      session.user.id
    )
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
