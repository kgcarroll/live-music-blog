import {NextResponse} from 'next/server'

import {createNewsletterConfirmToken} from '@/lib/newsletter/confirmToken'
import {getResendClient, getResendFromAddress} from '@/lib/newsletter/resendAudience'
import {absoluteSiteUrl} from '@/lib/siteUrl'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = {
  email?: string
  website?: string
}

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

  const email = String(body.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({error: 'Email is required'}, {status: 400})
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({error: 'Please enter a valid email address'}, {status: 400})
  }

  const resend = getResendClient()
  const from = getResendFromAddress()
  if (!resend || !from) {
    return NextResponse.json({error: 'Newsletter signup is not configured'}, {status: 500})
  }

  const token = createNewsletterConfirmToken(email)
  if (!token) {
    return NextResponse.json({error: 'Newsletter signup is not configured'}, {status: 500})
  }

  const confirmUrl = absoluteSiteUrl(`/api/newsletter/confirm?token=${encodeURIComponent(token)}`)

  const {error} = await resend.emails.send({
    from,
    to: [email],
    subject: 'Confirm your Philadelphia Music Live newsletter subscription',
    text: [
      'Thanks for signing up for Philadelphia Music Live.',
      '',
      'Confirm your subscription by opening this link:',
      confirmUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>Thanks for signing up for <strong>Philadelphia Music Live</strong>.</p>
      <p><a href="${confirmUrl}">Confirm your subscription</a></p>
      <p style="color:#71717a;font-size:14px;">If you did not request this, you can ignore this email.</p>
    `.trim(),
  })

  if (error) {
    console.error('[newsletter/subscribe]', error)
    const detail =
      process.env.NODE_ENV === 'development' && error.message ? error.message : 'Failed to send confirmation email'
    return NextResponse.json({error: detail}, {status: 500})
  }

  return NextResponse.json({ok: true})
}
