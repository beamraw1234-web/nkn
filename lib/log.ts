import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function createLog(
  username: string,
  action: string,
  role: string,
  details?: string,
  userId?: string
) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await prisma.log.create({
      data: {
        username,
        action,
        role,
        details,
        userId,
        ip,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to create log:', error)
  }
}
