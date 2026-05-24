import {timingSafeEqual} from 'node:crypto'

export function matchesNewsletterSendSecret(provided: string | null | undefined): boolean {
  const expected = process.env.NEWSLETTER_SEND_SECRET?.trim()
  if (!expected || !provided?.trim()) return false
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(provided.trim(), 'utf8')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function collectNewsletterSendSecret(request: Request, bodySecret?: string): string[] {
  const out: string[] = []
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim()
    if (token) out.push(token)
  }
  const header = request.headers.get('x-newsletter-send-secret')
  if (header?.trim()) out.push(header.trim())
  if (bodySecret?.trim()) out.push(bodySecret.trim())
  return out
}
