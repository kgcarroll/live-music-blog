import {revalidatePath} from 'next/cache'
import {type NextRequest, NextResponse} from 'next/server'

/**
 * POST from Sanity GROQ-powered webhook (optional).
 * Body: { secret, paths?: string[] } or query ?secret=&path=
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({message: 'SANITY_REVALIDATE_SECRET not set'}, {status: 501})
  }

  let body: {secret?: string; paths?: string[]} = {}
  try {
    body = (await request.json()) as {secret?: string; paths?: string[]}
  } catch {
    // allow empty body + query string
  }

  const url = new URL(request.url)
  const provided = body.secret ?? url.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({message: 'Invalid secret'}, {status: 401})
  }

  const paths = body.paths?.length
    ? body.paths
    : (url.searchParams.get('path')?.split(',') ?? ['/', '/interviews', '/photos', '/reviews'])

  for (const p of paths) {
    revalidatePath(p)
  }

  return NextResponse.json({revalidated: true, paths})
}
