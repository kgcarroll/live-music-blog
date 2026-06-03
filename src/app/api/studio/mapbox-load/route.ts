import {NextResponse} from 'next/server'

import {type MapboxLoadSource, recordMapboxLoad} from '@/lib/mapboxUsage'
import {siteOrigin} from '@/lib/siteUrl'

function isSameOriginRequest(request: Request): boolean {
  const allowed = siteOrigin()
  const origin = request.headers.get('origin')?.trim()
  if (origin && (origin === allowed || origin.startsWith(`${allowed}/`))) return true

  const referer = request.headers.get('referer')?.trim()
  if (referer && (referer === allowed || referer.startsWith(`${allowed}/`))) return true

  if (process.env.NODE_ENV === 'development') return true

  return false
}

function parseSource(body: unknown): MapboxLoadSource | null {
  if (!body || typeof body !== 'object') return null
  const source = (body as {source?: unknown}).source
  if (source === 'venues_hub' || source === 'venue_detail') return source
  return null
}

/** Increment monthly Mapbox map-load counters (public site + Studio same-origin). */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403})
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400})
  }

  const source = parseSource(body)
  if (!source) {
    return NextResponse.json({error: 'Invalid source'}, {status: 400})
  }

  await recordMapboxLoad(source)
  return NextResponse.json({ok: true})
}
