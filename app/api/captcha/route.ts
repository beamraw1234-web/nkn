import { NextResponse } from 'next/server'
import { createCaptchaChallenge, verifyCaptchaAnswer } from '@/lib/captcha'

export async function GET() {
  const challenge = createCaptchaChallenge()
  return NextResponse.json(challenge)
}

export async function POST(req: Request) {
  try {
    const { token, answer } = await req.json()
    if (!token || answer === undefined || answer === null) {
      return NextResponse.json({ ok: false, reason: 'missing' }, { status: 400 })
    }

    const numericAnswer = Number(answer)
    if (!Number.isFinite(numericAnswer)) {
      return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 })
    }

    const result = verifyCaptchaAnswer(String(token), numericAnswer)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return NextResponse.json({ ok: false, reason: 'error', detail: String(error) }, { status: 500 })
  }
}
