import {createHmac, timingSafeEqual} from 'node:crypto'

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000

function getSecret(): string | null {
  const secret = process.env.NEWSLETTER_CONFIRM_SECRET?.trim() || process.env.NEWSLETTER_SEND_SECRET?.trim()
  return secret || null
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createNewsletterConfirmToken(email: string): string | null {
  const secret = getSecret()
  if (!secret) return null

  const normalized = email.trim().toLowerCase()
  const expiresAt = Date.now() + TOKEN_TTL_MS
  const payload = `${normalized}|${expiresAt}`
  const signature = signPayload(payload, secret)
  return Buffer.from(`${payload}|${signature}`, 'utf8').toString('base64url')
}

export function verifyNewsletterConfirmToken(token: string): {email: string} | null {
  const secret = getSecret()
  if (!secret) return null

  let decoded: string
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const parts = decoded.split('|')
  if (parts.length !== 3) return null

  const [email, expiresRaw, signature] = parts
  const expiresAt = Number(expiresRaw)
  if (!email || !Number.isFinite(expiresAt) || !signature) return null
  if (Date.now() > expiresAt) return null

  const payload = `${email}|${expiresAt}`
  const expected = signPayload(payload, secret)
  try {
    const a = Buffer.from(signature, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  return {email}
}
