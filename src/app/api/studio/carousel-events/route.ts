import {NextResponse} from 'next/server'

import {listStudioCarouselEventOptions} from '@/lib/studioCarouselEvents'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await listStudioCarouselEventOptions()

  if ('error' in result) {
    return NextResponse.json(
      {error: result.error, events: []},
      {status: result.error === 'not_configured' ? 503 : 502},
    )
  }

  return NextResponse.json({events: result.events})
}
