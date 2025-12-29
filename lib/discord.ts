import { prisma } from "@/lib/prisma"

export async function sendDiscordWebhook(message: string, color: number = 5814783) {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['discord_webhook_url', 'notify_on_login']
        }
      }
    })

    const webhookUrl = settings.find(s => s.key === 'discord_webhook_url')?.value
    const notifyEnabled = settings.find(s => s.key === 'notify_on_login')?.value === 'true'

    if (!webhookUrl || !notifyEnabled) return

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          description: message,
          color: color,
          timestamp: new Date().toISOString(),
          footer: {
            text: "ServiceHub System"
          }
        }]
      })
    })
  } catch (error) {
    console.error('Failed to send Discord webhook:', error)
  }
}
