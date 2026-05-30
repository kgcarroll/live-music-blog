import {galleryImagesFromPortableBody} from '@/lib/portableTextGallery'
import {authorHref, editorialHref} from '@/lib/paths'
import {normalizeDescription, plainTextFromPortableText} from '@/lib/portableTextPlain'
import {resolveReviewSubject, type ReviewSubject} from '@/lib/reviewSubject'
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
  verdict?: string | null
  reviewSubject?: string | null
  showDate?: string | null
  venueName?: string | null
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

/**
 * itemReviewed shape depends on what the review covers (concert vs album vs video).
 * Live concerts use Event with optional date/venue; other subjects use simpler types.
 */
function buildReviewItemReviewed(
  headline: string,
  imageUrl: string | undefined,
  subject: ReviewSubject,
  showDate?: string | null,
  venueName?: string | null,
  publishedAt?: string | null,
): Record<string, unknown> {
  if (subject === 'album') {
    return {
      '@type': 'MusicAlbum',
      name: headline,
      ...(imageUrl ? {image: imageUrl} : {}),
    }
  }

  if (subject === 'video') {
    return {
      '@type': 'VideoObject',
      name: headline,
      ...(imageUrl ? {thumbnailUrl: imageUrl} : {}),
    }
  }

  if (subject !== 'liveConcert') {
    return {
      '@type': 'Thing',
      name: headline,
      ...(imageUrl ? {image: imageUrl} : {}),
    }
  }

  const startDate = showDate?.trim() || publishedAt?.trim()
  const locationName = venueName?.trim() || headline

  const item: Record<string, unknown> = {
    '@type': 'Event',
    name: headline,
    location: {
      '@type': 'Place',
      name: locationName,
    },
    ...(imageUrl ? {image: imageUrl} : {}),
  }

  if (startDate) item.startDate = startDate

  return item
}

function articleDescription(doc: EditorialJsonLdDoc): string | undefined {
  return (
    normalizeDescription(doc.seoDescription) ||
    normalizeDescription(doc.excerpt) ||
    normalizeDescription(doc.verdict) ||
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

  const galleryImages = galleryImagesFromPortableBody(doc.body)
  const imageObjects: Record<string, unknown>[] = []

  if (imageUrl) {
    imageObjects.push({
      '@type': 'ImageObject',
      url: imageUrl,
      ...(dims?.width ? {width: dims.width} : {}),
      ...(dims?.height ? {height: dims.height} : {}),
      ...(cover?.alt ? {caption: cover.alt} : {}),
    })
  }

  for (const img of galleryImages) {
    if (!img.asset?._id) continue
    const imgDims = img.asset.metadata?.dimensions
    const galleryUrl = urlForImage(img as never).width(OG_IMAGE_WIDTH).fit('max').url()
    imageObjects.push({
      '@type': 'ImageObject',
      url: galleryUrl,
      ...(imgDims?.width ? {width: imgDims.width} : {}),
      ...(imgDims?.height ? {height: imgDims.height} : {}),
      ...(img.alt?.trim() ? {caption: img.alt.trim()} : {}),
    })
  }

  if (imageObjects.length === 1) {
    payload.image = imageObjects[0]
  } else if (imageObjects.length > 1) {
    payload.image = imageObjects
  }

  if (schemaType === 'Review') {
    const reviewBody =
      normalizeDescription(doc.verdict) ||
      normalizeDescription(doc.excerpt) ||
      normalizeDescription(plainTextFromPortableText(doc.body))
    if (reviewBody) payload.reviewBody = reviewBody

    const reviewImageUrl =
      imageUrl ||
      (galleryImages[0]?.asset?._id
        ? urlForImage(galleryImages[0] as never).width(OG_IMAGE_WIDTH).fit('max').url()
        : undefined)

    payload.itemReviewed = buildReviewItemReviewed(
      headline.trim(),
      reviewImageUrl,
      resolveReviewSubject(doc.reviewSubject, doc.showDate, doc.venueName),
      doc.showDate,
      doc.venueName,
      doc.publishedAt,
    )
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
