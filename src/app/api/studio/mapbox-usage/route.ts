import {NextResponse} from 'next/server'

import {fetchMapboxUsageSummary} from '@/lib/mapboxUsage'
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

/** Mapbox map-load counters for the Integration Dashboard (Studio only). */
export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403})
  }

  const summary = await fetchMapboxUsageSummary()
  return NextResponse.json(summary)
}
