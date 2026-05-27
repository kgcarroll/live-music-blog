import {NextResponse} from 'next/server'

import {generateSeoWithOpenAI} from '@/lib/seoGeneration'
import {
  fetchSeoGenerationArticle,
  hasStoredSeoMetadata,
  validateSeoGenerationArticle,
} from '@/lib/seoGenerationArticle'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  documentId?: string
  regenerate?: boolean
  previousSeoTitle?: string
  previousSeoDescription?: string
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
  if (!documentId) {
    return NextResponse.json({error: 'documentId is required'}, {status: 400})
  }

  const regenerate = body.regenerate === true
  const additionalPrompt = String(body.additionalPrompt ?? '').trim()

  try {
    const raw = await fetchSeoGenerationArticle(documentId)
    const validated = validateSeoGenerationArticle(raw)
    if (!validated.ok) {
      return NextResponse.json({error: validated.error}, {status: 400})
    }

    const {article} = validated

    if (!regenerate && !additionalPrompt && hasStoredSeoMetadata(article)) {
      return NextResponse.json({
        ok: true,
        seoTitle: article.seoTitle!.trim(),
        seoDescription: article.seoDescription!.trim(),
        cached: true,
      })
    }

    const {seoTitle, seoDescription, model} = await generateSeoWithOpenAI(article, {
      regenerate,
      previousSeoTitle: body.previousSeoTitle,
      previousSeoDescription: body.previousSeoDescription,
      additionalPrompt: body.additionalPrompt,
    })

    return NextResponse.json({
      ok: true,
      seoTitle,
      seoDescription,
      cached: false,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SEO generation failed'
    return NextResponse.json({error: message}, {status: 500})
  }
}
