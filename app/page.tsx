import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'
import { prisma } from '@/lib/prisma'
import DashboardWrapper from '@/components/DashboardWrapper'
import MaintenanceScreen from '@/components/MaintenanceScreen'
import { redirect } from 'next/navigation'

type SystemSettingsDelegate = {
  findMany: (args: unknown) => Promise<Array<{ key: string; value: string | null }>>
}

export default async function Home({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if admin wants to view user dashboard
  const params = await searchParams
  const viewAsUser = params?.view === 'user'

  // Fetch Settings (Logo & Maintenance Mode)
  let logoUrl = 'https://placehold.co/100x100/6366f1/ffffff?text=Logo'
  let isMaintenance = false
  let maintenanceMessage = ''
  let maintenanceEndTime = ''

  try {
    const prismaAny = prisma as unknown as { systemSettings?: SystemSettingsDelegate; systemsettings?: SystemSettingsDelegate }
    const systemSettings = prismaAny.systemSettings ?? prismaAny.systemsettings
    if (!systemSettings) throw new Error('Prisma model delegate for SystemSettings not found')

    const settings = await systemSettings.findMany({
      where: {
        key: { in: ['site_logo', 'maintenance_mode', 'maintenance_message', 'maintenance_end_time'] }
      }
    })

    const logoSetting = settings.find((s) => s.key === 'site_logo')
    const maintenanceSetting = settings.find((s) => s.key === 'maintenance_mode')
    const messageSetting = settings.find((s) => s.key === 'maintenance_message')
    const endTimeSetting = settings.find((s) => s.key === 'maintenance_end_time')

    if (logoSetting?.value) {
      logoUrl = logoSetting.value
    }
    if (maintenanceSetting?.value === 'true') {
      isMaintenance = true
    }
    if (messageSetting?.value) {
      maintenanceMessage = messageSetting.value
    }
    if (endTimeSetting?.value) {
      maintenanceEndTime = endTimeSetting.value
    }

  } catch (error) {
    console.error("Failed to fetch settings:", error)
  }

  // If Maintenance Mode is ON and user is NOT Admin, show maintenance screen
  if (isMaintenance && session.user?.role !== 'ADMIN') {
    return <MaintenanceScreen message={maintenanceMessage} endTime={maintenanceEndTime} />
  }

  return <DashboardWrapper session={session} logoUrl={logoUrl} viewAsUser={viewAsUser} />
}
