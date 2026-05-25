import {NextResponse} from 'next/server'

import {
  articleUrlForFacebookCaption,
  countWords,
  generateFacebookCaptionWithOpenAI,
} from '@/lib/facebookCaption'
import {
  fetchFacebookCaptionArticle,
  validateFacebookCaptionArticle,
} from '@/lib/facebookCaptionArticle'
import {
  fetchStoredFacebookCaption,
  saveStoredFacebookCaption,
} from '@/lib/facebookCaptionStorage'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  documentId?: string
  regenerate?: boolean
  previousCaption?: string
  /** Save edited caption text without calling OpenAI. */
  save?: boolean
  caption?: string
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

  try {
    if (body.save === true) {
      const caption = String(body.caption ?? '').trim()
      if (!caption) {
        return NextResponse.json({error: 'caption is required to save'}, {status: 400})
      }

      const raw = await fetchFacebookCaptionArticle(documentId)
      const validated = validateFacebookCaptionArticle(raw)
      if (!validated.ok) {
        return NextResponse.json({error: validated.error}, {status: 400})
      }

      await saveStoredFacebookCaption(documentId, caption)

      return NextResponse.json({
        ok: true,
        caption,
        articleUrl: articleUrlForFacebookCaption(validated.article)!,
        title: validated.article.title!.trim(),
        wordCount: countWords(caption),
        cached: true,
      })
    }

    const raw = await fetchFacebookCaptionArticle(documentId)
    const validated = validateFacebookCaptionArticle(raw)
    if (!validated.ok) {
      return NextResponse.json({error: validated.error}, {status: 400})
    }

    const {article} = validated
    const articleUrl = articleUrlForFacebookCaption(article)!
    const title = article.title!.trim()

    if (!regenerate) {
      const stored = await fetchStoredFacebookCaption(documentId)
      if (stored) {
        return NextResponse.json({
          ok: true,
          caption: stored,
          articleUrl,
          title,
          wordCount: countWords(stored),
          cached: true,
        })
      }
    }

    const {caption, model} = await generateFacebookCaptionWithOpenAI(article, {
      regenerate,
      previousCaption: body.previousCaption,
    })

    await saveStoredFacebookCaption(documentId, caption)

    return NextResponse.json({
      ok: true,
      caption,
      articleUrl,
      title,
      wordCount: countWords(caption),
      cached: false,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Caption generation failed'
    return NextResponse.json({error: message}, {status: 500})
  }
}
