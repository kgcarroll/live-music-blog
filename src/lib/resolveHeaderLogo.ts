import {urlForImage} from '@/sanity/lib/image'

export type SanitySettingsLogo = {
  alt?: string | null
  asset?: {
    _id?: string
    metadata?: {
      lqip?: string | null
      dimensions?: {width?: number; height?: number} | null
    } | null
  } | null
} | null

export type HeaderLogo = {
  src: string
  alt: string
  width: number
  height: number
  lqip?: string | null
}

const DISPLAY_HEIGHT = 66

/** Build header logo dimensions and CDN URL from Site settings `logo`. */
export function resolveHeaderLogo(
  logo: SanitySettingsLogo,
  siteTitle: string,
): HeaderLogo | null {
  if (!logo?.asset?._id) return null

  const dims = logo.asset.metadata?.dimensions
  const intrinsicW = dims?.width && dims.width > 0 ? dims.width : 320
  const intrinsicH = dims?.height && dims.height > 0 ? dims.height : 80
  const displayW = Math.max(1, Math.round((intrinsicW / intrinsicH) * DISPLAY_HEIGHT))

  const src = urlForImage(logo as never)
    .height(DISPLAY_HEIGHT * 2)
    .fit('max')
    .url()

  return {
    src,
    alt: logo.alt?.trim() || siteTitle || 'Home',
    width: displayW,
    height: DISPLAY_HEIGHT,
    lqip: logo.asset.metadata?.lqip ?? null,
  }
}
