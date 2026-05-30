import {NextResponse} from 'next/server'

import {generateShowMetadataWithOpenAI, type ShowMetadataGenerationArticle} from '@/lib/showMetadataGeneration'
import {
  fetchShowMetadataGenerationArticle,
  validateShowMetadataGenerationArticle,
} from '@/lib/showMetadataGenerationArticle'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  documentId?: string
  draft?: {
    _type?: string
    title?: string
    excerpt?: string
    verdict?: unknown
    reviewSubject?: unknown
    showDate?: unknown
    venueName?: unknown
    body?: unknown
  }
  regenerate?: boolean
  previousShowDate?: string
  previousVenueName?: string
  additionalPrompt?: string
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

  const documentId = String(body.documentId || '').trim()

  try {
    const raw = documentId ? await fetchShowMetadataGenerationArticle(documentId) : null

    const draftArticle: ShowMetadataGenerationArticle | null =
      body.draft && typeof body.draft === 'object'
        ? {
            _type: body.draft._type ?? 'review',
            title: body.draft.title,
            excerpt: body.draft.excerpt,
            verdict: body.draft.verdict as string | null | undefined,
            reviewSubject: body.draft.reviewSubject as string | null | undefined,
            showDate: body.draft.showDate as string | null | undefined,
            venueName: body.draft.venueName as string | null | undefined,
            body: body.draft.body,
          }
        : null

    const validated = validateShowMetadataGenerationArticle(draftArticle ?? raw)
    if (!validated.ok) {
      return NextResponse.json({error: validated.error}, {status: 400})
    }

    const {showDate, venueName, confidence, note, model} = await generateShowMetadataWithOpenAI(
      validated.article,
      {
        regenerate: body.regenerate === true,
        previousShowDate: body.previousShowDate,
        previousVenueName: body.previousVenueName,
        additionalPrompt: body.additionalPrompt,
      },
    )

    return NextResponse.json({
      ok: true,
      showDate,
      venueName,
      confidence,
      note,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Show metadata generation failed'
    return NextResponse.json({error: message}, {status: 500})
  }
}
