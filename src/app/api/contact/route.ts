import {NextResponse} from 'next/server'
import {Resend} from 'resend'

type Body = {
  name?: string
  email?: string
  subject?: string
  message?: string
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

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const subject = String(body.subject || '').trim()
  const message = String(body.message || '').trim()

  if (!name || !email || !message) {
    return NextResponse.json({error: 'Missing required fields'}, {status: 400})
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL

  if (!apiKey || !to) {
    return NextResponse.json({error: 'Contact email is not configured on the server'}, {status: 500})
  }

  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from,
      to: [to],
      replyTo: email,
      subject: subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    })
    return NextResponse.json({ok: true})
  } catch {
    return NextResponse.json({error: 'Failed to send email'}, {status: 500})
  }
}
