import {NextResponse} from 'next/server'

import {appendTagToArticleTags} from '@/lib/appendTagToArticle'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  articleDocumentId?: string
  articleType?: string
  tagId?: string
  tagTitle?: string
}

function isSameOriginRequest(request: Request): boolean {
  const allowed = siteOrigin()
  const origin = request.headers.get('origin')?.trim()
  if (origin && (origin === allowed || origin.startsWith(`${allowed}/`))) return true

  const referer = request.headers.get('referer')?.trim()
  if (referer && (referer === allowed || referer.startsWith(`${allowed}/`))) return true

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

  const articleDocumentId = String(body.articleDocumentId ?? '').trim()
  const articleType = String(body.articleType ?? '').trim()
  const tagId = String(body.tagId ?? '').trim()
  const tagTitle = String(body.tagTitle ?? '').trim()

  if (!articleDocumentId || !articleType || !tagId) {
    return NextResponse.json(
      {error: 'articleDocumentId, articleType, and tagId are required'},
      {status: 400},
    )
  }

  try {
    const result = await appendTagToArticleTags(
      articleDocumentId,
      articleType,
      tagId,
      tagTitle || undefined,
    )
    return NextResponse.json({ok: true, result})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not link tag to article'
    return NextResponse.json({error: message}, {status: 500})
  }
}
