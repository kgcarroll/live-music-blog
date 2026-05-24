import {NextResponse} from 'next/server'

import {collectNewsletterSendSecret, matchesNewsletterSendSecret} from '@/lib/newsletter/auth'
import {sendNewsletterIssue} from '@/lib/newsletter/sendIssue'

type Body = {
  documentId?: string
  test?: boolean
  secret?: string
}

export async function POST(request: Request) {
  const configured = process.env.NEWSLETTER_SEND_SECRET?.trim()
  if (!configured) {
    return NextResponse.json({error: 'NEWSLETTER_SEND_SECRET is not configured'}, {status: 501})
  }

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400})
  }

  const provided = collectNewsletterSendSecret(request, body.secret)
  if (!provided.some((value) => matchesNewsletterSendSecret(value))) {
    return NextResponse.json({error: 'Invalid secret'}, {status: 401})
  }

  const documentId = String(body.documentId || '').trim()
  if (!documentId) {
    return NextResponse.json({error: 'documentId is required'}, {status: 400})
  }

  const result = await sendNewsletterIssue({
    documentId,
    test: body.test === true,
  })

  if (!('ok' in result)) {
    return NextResponse.json({error: result.error}, {status: result.status ?? 500})
  }

  return NextResponse.json({
    ok: true,
    test: result.test,
    broadcastId: result.broadcastId,
  })
}
