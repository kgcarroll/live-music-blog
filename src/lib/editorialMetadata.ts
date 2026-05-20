import type {Metadata} from 'next'

import {editorialHref, editorialTypeLabel} from '@/lib/paths'
import {normalizeDescription, plainTextFromPortableText} from '@/lib/portableTextPlain'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {urlForImage} from '@/sanity/lib/image'

type EditorialMetadataDoc = {
  _type: string
  title?: string | null
  slug?: string | null
  excerpt?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  publishedAt?: string | null
  body?: unknown
  coverImage?: {
    alt?: string | null
    hotspot?: unknown
    crop?: unknown
    asset?: {
      _id?: string
    } | null
  } | null
}

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630
export function buildEditorialMetadata(doc: EditorialMetadataDoc, fallbackTitle: string): Metadata {
  const title = doc.seoTitle || doc.title || fallbackTitle
  const description =
    normalizeDescription(doc.seoDescription) ||
    normalizeDescription(doc.excerpt) ||
    normalizeDescription(plainTextFromPortableText(doc.body)) ||
    normalizeDescription(doc.title)
  const url = doc.slug ? absoluteSiteUrl(editorialHref(doc._type, doc.slug)) : undefined
  const typeLabel = editorialTypeLabel(doc._type)
  const image =
    doc.coverImage?.asset?._id != null
      ? {
          url: urlForImage(doc.coverImage as never)
            .width(OG_IMAGE_WIDTH)
            .height(OG_IMAGE_HEIGHT)
            .fit('crop')
            .url(),
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: doc.coverImage.alt || doc.title || `${typeLabel} cover image`,
        }
      : null

  return {
    title,
    description,
    alternates: url ? {canonical: url} : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Live Music Blog',
      type: 'article',
      publishedTime: doc.publishedAt || undefined,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  }
}
