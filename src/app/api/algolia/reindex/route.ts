import {type NextRequest, NextResponse} from 'next/server'

import {runFullEditorialAlgoliaReindex} from '@/lib/algolia/reindexEditorialAlgolia'

export const maxDuration = 60

/**
 * POST — full editorial reindex (Sanity → Algolia).
 * Body `{ "secret": "…" }` or query `?secret=…` must match `ALGOLIA_REINDEX_SECRET`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ALGOLIA_REINDEX_SECRET
  if (!secret) {
    return NextResponse.json({message: 'ALGOLIA_REINDEX_SECRET not set'}, {status: 501})
  }

  let body: {secret?: string} = {}
  try {
    body = (await request.json()) as {secret?: string}
  } catch {
    // allow query-only auth
  }

  const url = new URL(request.url)
  const provided = body.secret ?? url.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({message: 'Invalid secret'}, {status: 401})
  }

  try {
    const {count} = await runFullEditorialAlgoliaReindex()
    return NextResponse.json({ok: true, count})
  } catch (err) {
    console.error('[algolia/reindex]', err)
    const message = err instanceof Error ? err.message : 'Reindex failed'
    return NextResponse.json({ok: false, message}, {status: 500})
  }
}
