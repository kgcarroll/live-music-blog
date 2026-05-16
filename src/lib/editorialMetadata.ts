import type {Metadata} from 'next'

import {editorialHref, editorialTypeLabel} from '@/lib/paths'
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
const DESCRIPTION_MAX_LENGTH = 160

function siteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

function absoluteSiteUrl(path: string) {
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}

function plainTextFromPortableText(value: unknown): string {
  if (!Array.isArray(value)) return ''

  return value
    .map((block: unknown) => {
      if (
        block == null ||
        typeof block !== 'object' ||
        !('children' in block) ||
        !Array.isArray((block as {children?: unknown}).children)
      ) {
        return ''
      }

      return (block as {children: unknown[]}).children
        .map((child: unknown) => {
          if (child == null || typeof child !== 'object' || !('text' in child)) return ''
          const text = (child as {text?: unknown}).text
          return typeof text === 'string' ? text : ''
        })
        .join('')
    })
    .filter(Boolean)
    .join(' ')
}

function normalizeDescription(value: string | null | undefined): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text

  const truncated = text.slice(0, DESCRIPTION_MAX_LENGTH - 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.slice(0, lastSpace > 80 ? lastSpace : truncated.length).trim()}…`
}

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
