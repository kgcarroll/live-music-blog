import {publishedDocumentId} from '@/lib/facebookCaptionStorage'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {isLiveConcertReviewSubject, resolveReviewSubject} from '@/lib/reviewSubject'
import type {ShowMetadataGenerationArticle} from '@/lib/showMetadataGeneration'
import {client} from '@/sanity/lib/client'

const SHOW_METADATA_ARTICLE_QUERY = `*[_id == $id][0]{
  _type,
  title,
  excerpt,
  verdict,
  reviewSubject,
  showDate,
  venueName,
  body
}`

async function fetchShowMetadataArticleById(
  id: string,
): Promise<ShowMetadataGenerationArticle | null> {
  return client.fetch<ShowMetadataGenerationArticle | null>(
    SHOW_METADATA_ARTICLE_QUERY,
    {id},
    {useCdn: false},
  )
}

/** Prefer draft (current Studio edit) over published. */
export async function fetchShowMetadataGenerationArticle(
  documentId: string,
): Promise<ShowMetadataGenerationArticle | null> {
  const publishedId = publishedDocumentId(documentId)
  const draftId = documentId.startsWith('drafts.') ? documentId : `drafts.${publishedId}`

  const fromDraft = await fetchShowMetadataArticleById(draftId)
  if (fromDraft) return fromDraft

  return fetchShowMetadataArticleById(publishedId)
}

export function validateShowMetadataGenerationArticle(
  article: ShowMetadataGenerationArticle | null,
): {ok: true; article: ShowMetadataGenerationArticle} | {ok: false; error: string} {
  if (!article) {
    return {ok: false, error: 'Document not found.'}
  }
  if (article._type !== 'review') {
    return {ok: false, error: 'Concert metadata suggestions are only available for reviews.'}
  }

  const subject = resolveReviewSubject(article.reviewSubject, article.showDate, article.venueName)
  if (!isLiveConcertReviewSubject(subject)) {
    return {
      ok: false,
      error:
        'Set “What is this review about?” to Live concert before suggesting concert date and venue.',
    }
  }
  if (!article.title?.trim()) {
    return {ok: false, error: 'Title is required before suggesting show metadata.'}
  }

  const bodyText = plainTextFromPortableText(article.body as never)
  const excerpt = article.excerpt?.trim() ?? ''
  const verdict = article.verdict?.trim() ?? ''
  if (!bodyText && !excerpt && !verdict) {
    return {
      ok: false,
      error: 'Add review body, excerpt, or verdict content before suggesting show metadata.',
    }
  }

  return {ok: true, article}
}
