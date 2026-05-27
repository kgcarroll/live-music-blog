import {
  buildSeoGenerationContext,
  isSeoEditorialType,
  type SeoGenerationArticle,
} from '@/lib/seoGeneration'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {publishedDocumentId} from '@/lib/facebookCaptionStorage'
import {client} from '@/sanity/lib/client'

const SEO_ARTICLE_QUERY = `*[_id == $id][0]{
  _type,
  title,
  "slug": slug.current,
  excerpt,
  seoTitle,
  seoDescription,
  verdict,
  showDate,
  venueName,
  body
}`

async function fetchSeoArticleById(id: string): Promise<SeoGenerationArticle | null> {
  return client.fetch<SeoGenerationArticle | null>(SEO_ARTICLE_QUERY, {id}, {useCdn: false})
}

/** Prefer draft (current Studio edit) over published. */
export async function fetchSeoGenerationArticle(
  documentId: string,
): Promise<SeoGenerationArticle | null> {
  const publishedId = publishedDocumentId(documentId)
  const draftId = documentId.startsWith('drafts.') ? documentId : `drafts.${publishedId}`

  const fromDraft = await fetchSeoArticleById(draftId)
  if (fromDraft) return fromDraft

  return fetchSeoArticleById(publishedId)
}

export function validateSeoGenerationArticle(
  article: SeoGenerationArticle | null,
): {ok: true; article: SeoGenerationArticle} | {ok: false; error: string} {
  if (!article) {
    return {ok: false, error: 'Document not found.'}
  }
  if (!isSeoEditorialType(article._type)) {
    return {ok: false, error: 'This document type does not support SEO generation.'}
  }
  if (!article.title?.trim()) {
    return {ok: false, error: 'Title is required before generating SEO metadata.'}
  }

  const bodyText = plainTextFromPortableText(article.body as never)
  const excerpt = article.excerpt?.trim() ?? ''
  if (!bodyText && !excerpt) {
    return {
      ok: false,
      error: 'Add article body or excerpt content before generating SEO metadata.',
    }
  }

  return {ok: true, article}
}

export function hasStoredSeoMetadata(article: SeoGenerationArticle): boolean {
  return Boolean(article.seoTitle?.trim() && article.seoDescription?.trim())
}
