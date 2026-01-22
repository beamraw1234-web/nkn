import crypto from 'crypto'

const CAPTCHA_TTL_MS = 3 * 60 * 1000

type CaptchaPayload = {
  a: number
  b: number
  operator: '+' | 'x'
  ts: number
}

const encodeBase64Url = (value: string) =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const decodeBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const pad = padLength ? '='.repeat(padLength) : ''
  return Buffer.from(padded + pad, 'base64').toString('utf8')
}

const getSecret = () => process.env.NEXTAUTH_SECRET || 'dev-secret'

const sign = (payload: string) =>
  crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')

const calculateAnswer = (payload: CaptchaPayload) =>
  payload.operator === '+' ? payload.a + payload.b : payload.a * payload.b

const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

const createPayload = (): CaptchaPayload => {
  const a = Math.floor(Math.random() * 8) + 2
  const b = Math.floor(Math.random() * 8) + 2
  const operator: CaptchaPayload['operator'] = Math.random() > 0.5 ? '+' : 'x'
  return { a, b, operator, ts: Date.now() }
}

export const createCaptchaChallenge = () => {
  const payload = createPayload()
  const encoded = encodeBase64Url(JSON.stringify(payload))
  const signature = sign(encoded)
  const token = `${encoded}.${signature}`
  const question = `${payload.a} ${payload.operator} ${payload.b} = ?`

  return { token, question, expiresInMs: CAPTCHA_TTL_MS }
}

export const verifyCaptchaAnswer = (token: string, answer: number) => {
  const [payloadPart, signature] = token.split('.')
  if (!payloadPart || !signature) {
    return { ok: false, reason: 'malformed' }
  }

  const expectedSig = sign(payloadPart)
  if (!safeEqual(signature, expectedSig)) {
    return { ok: false, reason: 'signature' }
  }

  let payload: CaptchaPayload
  try {
    payload = JSON.parse(decodeBase64Url(payloadPart)) as CaptchaPayload
  } catch {
    return { ok: false, reason: 'payload' }
  }

  if (!payload.ts || Date.now() - payload.ts > CAPTCHA_TTL_MS) {
    return { ok: false, reason: 'expired' }
  }

  return calculateAnswer(payload) === answer
    ? { ok: true, reason: 'ok' }
    : { ok: false, reason: 'answer' }
}
