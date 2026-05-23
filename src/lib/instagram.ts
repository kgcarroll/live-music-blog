export type InstagramEmbedKind = 'post' | 'reel' | 'tv'

export type InstagramEmbedInfo = {
  kind: InstagramEmbedKind
  shortcode: string
  /** Canonical post/reel URL for “View on Instagram”. */
  permalink: string
}

function isLikelyShortcode(value: string): boolean {
  return /^[\w-]{5,64}$/.test(value)
}

function buildEmbedInfo(kind: InstagramEmbedKind, shortcode: string): InstagramEmbedInfo {
  const path = kind === 'post' ? 'p' : kind === 'reel' ? 'reel' : 'tv'
  return {
    kind,
    shortcode,
    permalink: `https://www.instagram.com/${path}/${shortcode}/`,
  }
}

/** Extract Instagram post/reel/tv info from a share or embed URL. */
export function getInstagramEmbedInfo(input: string | null | undefined): InstagramEmbedInfo | null {
  const raw = input?.trim()
  if (!raw) return null

  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    const host = u.hostname.replace(/^www\./, '')
    if (host !== 'instagram.com') return null

    const segments = u.pathname.split('/').filter(Boolean)
    if (segments.length < 2) return null

    const [segment, shortcode] = segments
    if (!isLikelyShortcode(shortcode)) return null

    if (segment === 'p') return buildEmbedInfo('post', shortcode)
    if (segment === 'reel' || segment === 'reels') return buildEmbedInfo('reel', shortcode)
    if (segment === 'tv') return buildEmbedInfo('tv', shortcode)

    return null
  } catch {
    return null
  }
}

export function instagramEmbedKindLabel(kind: InstagramEmbedKind): string {
  switch (kind) {
    case 'post':
      return 'Post'
    case 'reel':
      return 'Reel'
    case 'tv':
      return 'IGTV'
  }
}

/** Width limits from Instagram’s embed guidelines (326–540px). */
export function instagramEmbedLayout(kind: InstagramEmbedKind): {
  minWidthPx: number
  maxWidthPx: number
} {
  switch (kind) {
    case 'reel':
      return {minWidthPx: 280, maxWidthPx: 325}
    case 'tv':
      return {minWidthPx: 326, maxWidthPx: 540}
    default:
      return {minWidthPx: 326, maxWidthPx: 540}
  }
}

/** Permalink with UTM params Instagram’s embed script expects. */
export function instagramEmbedPermalink(permalink: string): string {
  const url = new URL(permalink)
  url.searchParams.set('utm_source', 'ig_embed')
  url.searchParams.set('utm_campaign', 'loading')
  return url.toString()
}
