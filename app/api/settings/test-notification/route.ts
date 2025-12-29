import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/authOptions'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { webhookUrl } = await req.json()

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 })
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: "🔔 ทดสอบการแจ้งเตือน",
          description: "ระบบสามารถเชื่อมต่อกับ Discord ได้สำเร็จ\n\nThis is a test message from ServiceHub.",
          color: 3447003, // Blue
          timestamp: new Date().toISOString(),
          footer: {
            text: "ServiceHub System Test"
          }
        }]
      })
    })

    if (!res.ok) {
        throw new Error(`Discord API responded with ${res.status}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Test notification error:", error)
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 })
  }
}
