import {authorHref, editorialHref} from '@/lib/paths'
import {normalizeDescription, plainTextFromPortableText} from '@/lib/portableTextPlain'
import {absoluteSiteUrl, siteOrigin} from '@/lib/siteUrl'
import {urlForImage} from '@/sanity/lib/image'

const SITE_NAME = 'Live Music Blog'
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export type EditorialJsonLdDoc = {
  _type: string
  title?: string | null
  slug?: string | null
  excerpt?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  publishedAt?: string | null
  subhead?: string | null
  verdict?: string | null
  body?: unknown
  author?: {
    name?: string | null
    slug?: string | null
  } | null
  coverImage?: {
    alt?: string | null
    hotspot?: unknown
    crop?: unknown
    asset?: {
      _id?: string
      metadata?: {dimensions?: {width?: number; height?: number}} | null
    } | null
  } | null
}

function jsonLdArticleType(editorialType: string): string {
  switch (editorialType) {
    case 'news':
      return 'NewsArticle'
    case 'review':
      return 'Review'
    default:
      return 'Article'
  }
}

function articleDescription(doc: EditorialJsonLdDoc): string | undefined {
  return (
    normalizeDescription(doc.seoDescription) ||
    normalizeDescription(doc.excerpt) ||
    normalizeDescription(doc.verdict) ||
    normalizeDescription(doc.subhead) ||
    normalizeDescription(plainTextFromPortableText(doc.body)) ||
    normalizeDescription(doc.title)
  )
}

export function buildEditorialJsonLd(doc: EditorialJsonLdDoc): Record<string, unknown> {
  const headline = doc.seoTitle || doc.title
  if (!headline?.trim() || !doc.slug?.trim()) {
    return {}
  }

  const url = absoluteSiteUrl(editorialHref(doc._type, doc.slug.trim()))
  const description = articleDescription(doc)
  const authorName = doc.author?.name?.trim()
  const authorSlug = doc.author?.slug?.trim()

  const cover = doc.coverImage
  const dims = cover?.asset?.metadata?.dimensions
  const imageUrl =
    cover?.asset?._id != null
      ? urlForImage(cover as never).width(OG_IMAGE_WIDTH).height(OG_IMAGE_HEIGHT).fit('crop').url()
      : undefined

  const schemaType = jsonLdArticleType(doc._type)

  const payload: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    headline: headline.trim(),
    ...(description ? {description} : {}),
    ...(doc.publishedAt ? {datePublished: doc.publishedAt} : {}),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteOrigin(),
    },
  }

  if (authorName) {
    payload.author = {
      '@type': 'Person',
      name: authorName,
      ...(authorSlug ? {url: absoluteSiteUrl(authorHref(authorSlug))} : {}),
    }
  }

  if (imageUrl) {
    payload.image = {
      '@type': 'ImageObject',
      url: imageUrl,
      ...(dims?.width ? {width: dims.width} : {}),
      ...(dims?.height ? {height: dims.height} : {}),
      ...(cover?.alt ? {caption: cover.alt} : {}),
    }
  }

  if (schemaType === 'Review') {
    const reviewBody =
      normalizeDescription(doc.verdict) ||
      normalizeDescription(doc.excerpt) ||
      normalizeDescription(plainTextFromPortableText(doc.body))
    if (reviewBody) payload.reviewBody = reviewBody
  }

  return payload
}

export function buildWebSiteJsonLd({
  siteTitle,
  description,
}: {
  siteTitle: string
  description: string
}): Record<string, unknown> {
  const url = siteOrigin()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteTitle,
    url,
    description: normalizeDescription(description) ?? description,
    publisher: {
      '@type': 'Organization',
      name: siteTitle,
      url,
    },
  }
}
