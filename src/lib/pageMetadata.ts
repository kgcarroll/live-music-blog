import type {Metadata} from 'next'

import {normalizeDescription} from '@/lib/portableTextPlain'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {urlForImage} from '@/sanity/lib/image'

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630
const SITE_NAME = 'Live Music Blog'

export type OgImageMeta = {
  url: string
  width: number
  height: number
  alt: string
}

export type SiteSettingsOgImage = {
  siteTitle?: string | null
  logo?: {
    alt?: string | null
    hotspot?: unknown
    crop?: unknown
    asset?: {_id?: string} | null
  } | null
} | null

export function ogImageFromSiteSettings(settings: SiteSettingsOgImage): OgImageMeta | undefined {
  const logo = settings?.logo
  if (!logo?.asset?._id) return undefined

  return {
    url: urlForImage(logo as never).width(OG_IMAGE_WIDTH).height(OG_IMAGE_HEIGHT).fit('crop').url(),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: logo.alt || settings?.siteTitle || SITE_NAME,
  }
}

export function buildPageMetadata({
  title,
  description,
  path,
  ogImage,
  openGraphType = 'website',
}: {
  title: string
  description: string
  path: string
  ogImage?: OgImageMeta
  openGraphType?: 'website' | 'article'
}): Metadata {
  const normalizedDescription = normalizeDescription(description) ?? description
  const url = absoluteSiteUrl(path)
  const image = ogImage ?? undefined

  return {
    title,
    description: normalizedDescription,
    alternates: {canonical: url},
    openGraph: {
      title,
      description: normalizedDescription,
      url,
      siteName: SITE_NAME,
      type: openGraphType,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: normalizedDescription,
      images: image ? [image.url] : undefined,
    },
  }
}
