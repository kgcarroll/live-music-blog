import {NextResponse} from 'next/server'

import {suggestTagsWithOpenAI} from '@/lib/tagSuggestion'
import {
  fetchAllTags,
  fetchTagSuggestionArticle,
  validateTagSuggestionArticle,
} from '@/lib/tagSuggestionArticle'
import {saveStoredTagSuggestions} from '@/lib/tagSuggestionStorage'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  documentId?: string
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

  const documentId = String(body.documentId ?? '').trim()
  if (!documentId) {
    return NextResponse.json({error: 'documentId is required'}, {status: 400})
  }

  try {
    const [rawArticle, tags] = await Promise.all([
      fetchTagSuggestionArticle(documentId),
      fetchAllTags(),
    ])
    const validated = validateTagSuggestionArticle(rawArticle)
    if (!validated.ok) {
      return NextResponse.json({error: validated.error}, {status: 400})
    }

    if (!tags.length) {
      return NextResponse.json(
        {error: 'No tags exist yet. Create tags first, then run suggestions.'},
        {status: 400},
      )
    }

    const {tagIds, newTags, model} = await suggestTagsWithOpenAI({
      article: validated.article,
      existingTags: tags,
      additionalPrompt: body.additionalPrompt,
    })

    const idToTag = new Map(tags.map((t) => [t._id, t]))
    const suggestedTags = tagIds
      .map((id) => idToTag.get(id))
      .filter(Boolean)
      .map((t) => ({_id: t!._id, title: t!.title, slug: t!.slug ?? null}))

    await saveStoredTagSuggestions(documentId, {
      tags: suggestedTags,
      newTags,
      model,
    })

    return NextResponse.json({
      ok: true,
      tags: suggestedTags,
      newTags,
      model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tag suggestion failed'
    return NextResponse.json({error: message}, {status: 500})
  }
}

