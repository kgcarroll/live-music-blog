import {NextResponse} from 'next/server'
import {Resend} from 'resend'

type Body = {
  name?: string
  email?: string
  subject?: string
  message?: string
  website?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400})
  }

  if (body.website) {
    return NextResponse.json({ok: true})
  }

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const subject = String(body.subject || '').trim()
  const message = String(body.message || '').trim()

  if (!name || !email || !message) {
    return NextResponse.json({error: 'Missing required fields'}, {status: 400})
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({error: 'Please enter a valid email address'}, {status: 400})
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.CONTACT_TO_EMAIL?.trim()

  if (!apiKey || !to) {
    return NextResponse.json({error: 'Contact email is not configured on the server'}, {status: 500})
  }

  const from = process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev'

  const resend = new Resend(apiKey)
  const mailSubject = subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`
  const text = `Name: ${name}\nEmail: ${email}\n\n${message}`

  const {error} = await resend.emails.send({
    from,
    to: [to],
    replyTo: email,
    subject: mailSubject,
    text,
    html: `
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `.trim(),
  })

  if (error) {
    console.error('[contact] Resend error:', error)
    const detail =
      process.env.NODE_ENV === 'development' && error.message ? error.message : 'Failed to send email'
    return NextResponse.json({error: detail}, {status: 500})
  }

  return NextResponse.json({ok: true})
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
