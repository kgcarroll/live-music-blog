import crypto from 'node:crypto'

import {type NextRequest, NextResponse} from 'next/server'
import {parseBody} from 'next-sanity/webhook'

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
 * Auth (first match wins):
 * 1. **Sanity GROQ webhook** — set the webhook “Secret” in Sanity to the same value as `ALGOLIA_REINDEX_SECRET`.
 *    Requests include `sanity-webhook-signature`; verified with `next-sanity/webhook` `parseBody`.
 * 2. **Custom** — value must equal `ALGOLIA_REINDEX_SECRET` via:
 *    - Header named in env `ALGOLIA_REINDEX_SECRET_HEADER` (value in Sanity = that header’s **name**, e.g. `X-Algolia-Reindex-Secret`, not this env var’s name)
 *    - `x-algolia-reindex-secret`
 *    - `Authorization: Bearer …` or raw `Authorization: …`
 *    - JSON `{ "secret": "…" }` or query `?secret=…`
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ALGOLIA_REINDEX_SECRET
  if (!secret) {
    return NextResponse.json({message: 'ALGOLIA_REINDEX_SECRET not set'}, {status: 501})
  }

  const sanitySignature = request.headers.get('sanity-webhook-signature')
  if (sanitySignature) {
    try {
      const {isValidSignature} = await parseBody(request, secret, false)
      if (isValidSignature !== true) {
        return NextResponse.json({message: 'Invalid Sanity webhook signature'}, {status: 401})
      }
    } catch {
      return NextResponse.json({message: 'Invalid webhook payload'}, {status: 400})
    }
  } else {
    let body: {secret?: string} = {}
    try {
      body = (await request.json()) as {secret?: string}
    } catch {
      // empty or non-JSON body
    }

    const provided = collectProvidedSecrets(request, body.secret)
    if (!matchesSecret(secret, provided)) {
      return NextResponse.json({message: 'Invalid secret'}, {status: 401})
    }
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
