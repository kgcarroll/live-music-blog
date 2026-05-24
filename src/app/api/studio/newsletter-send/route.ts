import {NextResponse} from 'next/server'

import {sendNewsletterIssue} from '@/lib/newsletter/sendIssue'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  documentId?: string
  test?: boolean
}

/** Allow Studio (same site) to trigger sends without exposing NEWSLETTER_SEND_SECRET to the browser. */
function isSameOriginRequest(request: Request): boolean {
  const allowed = siteOrigin()
  const origin = request.headers.get('origin')?.trim()
  if (origin && (origin === allowed || origin.startsWith(`${allowed}/`))) return true

  const referer = request.headers.get('referer')?.trim()
  if (referer && (referer === allowed || referer.startsWith(`${allowed}/`))) return true

  // Local dev: Studio and API share the host (no cross-origin preflight from document actions).
  if (process.env.NODE_ENV === 'development') return true

  return false
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403})
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400})
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
