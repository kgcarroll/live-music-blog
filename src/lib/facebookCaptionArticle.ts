import {
  articleUrlForFacebookCaption,
  type FacebookCaptionArticle,
  isFacebookCaptionEditorialType,
} from '@/lib/facebookCaption'
import {publishedDocumentId} from '@/lib/facebookCaptionStorage'
import {client} from '@/sanity/lib/client'

const FACEBOOK_CAPTION_ARTICLE_QUERY = `*[_id == $id][0]{
  _type,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  seoDescription,
  verdict,
  showDate,
  venueName,
  body
}`

export async function fetchFacebookCaptionArticle(
  documentId: string,
): Promise<FacebookCaptionArticle | null> {
  return client.fetch<FacebookCaptionArticle | null>(
    FACEBOOK_CAPTION_ARTICLE_QUERY,
    {id: publishedDocumentId(documentId)},
    {perspective: 'published', useCdn: false},
  )
}

export function validateFacebookCaptionArticle(
  article: FacebookCaptionArticle | null,
): {ok: true; article: FacebookCaptionArticle} | {ok: false; error: string} {
  if (!article) {
    return {ok: false, error: 'No published version found. Publish the article first.'}
  }
  if (!isFacebookCaptionEditorialType(article._type)) {
    return {ok: false, error: 'This document type does not support Facebook captions.'}
  }
  if (!article.publishedAt?.trim()) {
    return {ok: false, error: 'Published date is required.'}
  }
  if (!article.slug?.trim()) {
    return {ok: false, error: 'Slug is required.'}
  }
  if (!article.title?.trim()) {
    return {ok: false, error: 'Title is required.'}
  }
  if (!articleUrlForFacebookCaption(article)) {
    return {ok: false, error: 'Could not build the article URL.'}
  }
  return {ok: true, article}
}
