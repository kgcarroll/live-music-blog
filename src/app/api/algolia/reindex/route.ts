import crypto from 'node:crypto'

import {type NextRequest, NextResponse} from 'next/server'

import {runFullEditorialAlgoliaReindex} from '@/lib/algolia/reindexEditorialAlgolia'

export const maxDuration = 60

function timingSafeEqualString(expected: string, received: string): boolean {
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(received, 'utf8')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** True if any candidate matches `expected` (length-sensitive, timing-safe per candidate). */
function matchesSecret(expected: string, candidates: string[]): boolean {
  return candidates.some((c) => timingSafeEqualString(expected, c))
}

function collectProvidedSecrets(request: NextRequest, bodySecret?: string): string[] {
  const out: string[] = []
  const named = process.env.ALGOLIA_REINDEX_SECRET_HEADER?.trim()
  if (named) {
    const v = request.headers.get(named)
    if (v?.trim()) out.push(v.trim())
  }
  const x = request.headers.get('x-algolia-reindex-secret')
  if (x?.trim()) out.push(x.trim())
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const t = auth.slice('Bearer '.length).trim()
    if (t) out.push(t)
  } else if (auth?.trim()) {
    out.push(auth.trim())
  }
  if (bodySecret?.trim()) out.push(bodySecret.trim())
  const q = request.nextUrl.searchParams.get('secret')
  if (q?.trim()) out.push(q.trim())
  return out
}

/**
 * POST — full editorial reindex (Sanity → Algolia).
 *
 * Auth: value must match `ALGOLIA_REINDEX_SECRET` from any of:
 * - Header named in `ALGOLIA_REINDEX_SECRET_HEADER` (for webhooks that only allow custom headers)
 * - `x-algolia-reindex-secret`
 * - `Authorization: Bearer …` or raw `Authorization: …`
 * - JSON body `{ "secret": "…" }` or query `?secret=…`
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
    // empty or non-JSON body (typical for header-only webhooks)
  }

  const provided = collectProvidedSecrets(request, body.secret)
  if (!matchesSecret(secret, provided)) {
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
