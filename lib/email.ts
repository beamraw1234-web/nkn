import { randomUUID } from 'crypto'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

export const getAppUrl = () => {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return appUrl.replace(/\/$/, '')
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY || ''
  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || ''

  if (!apiKey || !from) {
    throw new Error('Resend is not configured (RESEND_API_KEY/RESEND_FROM missing)')
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text
    })
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend error: ${res.status} ${detail}`)
  }

  return res.json().catch(() => ({}))
}
