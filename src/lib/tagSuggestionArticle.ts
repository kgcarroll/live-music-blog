import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {publishedDocumentId} from '@/lib/facebookCaptionStorage'
import {client} from '@/sanity/lib/client'
import {
  isTagSuggestionEditorialType,
  type ExistingTag,
  type TagSuggestionArticle,
} from '@/lib/tagSuggestion'

const ARTICLE_QUERY = `*[_id == $id][0]{
  _type,
  title,
  excerpt,
  body,
  tags[] {_ref}
}`

const TAG_LIST_QUERY = `*[_type == "tag"]|order(title asc){
  _id,
  title,
  "slug": slug.current
}`

async function fetchById(id: string): Promise<TagSuggestionArticle | null> {
  return client.fetch<TagSuggestionArticle | null>(ARTICLE_QUERY, {id}, {useCdn: false})
}

/** Prefer draft (current Studio edit) over published. */
export async function fetchTagSuggestionArticle(
  documentId: string,
): Promise<TagSuggestionArticle | null> {
  const publishedId = publishedDocumentId(documentId)
  const draftId = documentId.startsWith('drafts.') ? documentId : `drafts.${publishedId}`

  const fromDraft = await fetchById(draftId)
  if (fromDraft) return fromDraft

  return fetchById(publishedId)
}

export async function fetchAllTags(): Promise<ExistingTag[]> {
  const tags = await client.fetch<ExistingTag[]>(TAG_LIST_QUERY, {}, {useCdn: false})
  return Array.isArray(tags) ? tags.filter((t) => t && t._id && t.title) : []
}

export function validateTagSuggestionArticle(
  article: TagSuggestionArticle | null,
): {ok: true; article: TagSuggestionArticle} | {ok: false; error: string} {
  if (!article) return {ok: false, error: 'Document not found.'}
  if (!isTagSuggestionEditorialType(article._type)) {
    return {ok: false, error: 'This document type does not support tag suggestions.'}
  }
  if (!article.title?.trim()) {
    return {ok: false, error: 'Title is required before suggesting tags.'}
  }
  const bodyText = plainTextFromPortableText(article.body as never)
  const excerpt = article.excerpt?.trim() ?? ''
  if (!bodyText && !excerpt) {
    return {ok: false, error: 'Add body or excerpt content before suggesting tags.'}
  }
  return {ok: true, article}
}

