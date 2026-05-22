export type SpotifyEmbedType = 'track' | 'album' | 'playlist' | 'artist' | 'episode' | 'show'

export type SpotifyEmbedInfo = {
  type: SpotifyEmbedType
  id: string
  embedSrc: string
  listenUrl: string
  height: number
  width: number
}

/** Spotify oEmbed uses 456px as the designed embed width. */
export const SPOTIFY_EMBED_MAX_WIDTH = 456

const SPOTIFY_EMBED_TYPES: readonly SpotifyEmbedType[] = [
  'track',
  'album',
  'playlist',
  'artist',
  'episode',
  'show',
]

const DEFAULT_EMBED_HEIGHT: Record<SpotifyEmbedType, number> = {
  track: 152,
  episode: 232,
  album: 352,
  playlist: 352,
  artist: 352,
  show: 352,
}

function isSpotifyEmbedType(value: string): value is SpotifyEmbedType {
  return (SPOTIFY_EMBED_TYPES as readonly string[]).includes(value)
}

function isLikelySpotifyId(id: string): boolean {
  return /^[A-Za-z0-9]{10,64}$/.test(id)
}

function buildEmbedSrc(type: SpotifyEmbedType, id: string): string {
  const params = new URLSearchParams({
    utm_source: 'oembed',
    theme: '0',
  })
  return `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?${params}`
}

function buildListenUrl(type: SpotifyEmbedType, id: string): string {
  return `https://open.spotify.com/${type}/${encodeURIComponent(id)}`
}

function buildEmbedInfo(type: SpotifyEmbedType, id: string, height = DEFAULT_EMBED_HEIGHT[type]): SpotifyEmbedInfo {
  return {
    type,
    id,
    embedSrc: buildEmbedSrc(type, id),
    listenUrl: buildListenUrl(type, id),
    height,
    width: SPOTIFY_EMBED_MAX_WIDTH,
  }
}

function parseSpotifyUri(raw: string): SpotifyEmbedInfo | null {
  const match = raw.trim().match(/^spotify:((?:track|album|playlist|artist|episode|show)):([A-Za-z0-9]+)$/i)
  if (!match) return null
  const type = match[1].toLowerCase() as SpotifyEmbedType
  const id = match[2]
  if (!isSpotifyEmbedType(type) || !isLikelySpotifyId(id)) return null
  return buildEmbedInfo(type, id)
}

function parseSpotifyPath(pathname: string): SpotifyEmbedInfo | null {
  const segments = pathname.split('/').filter(Boolean)

  while (segments.length >= 2 && !isSpotifyEmbedType(segments[0])) {
    segments.shift()
  }

  if (segments.length < 2) return null

  const type = segments[0]
  const id = segments[1]?.split('?')[0] ?? ''
  if (!isSpotifyEmbedType(type) || !isLikelySpotifyId(id)) return null

  return buildEmbedInfo(type, id)
}

/** Parse a Spotify share or embed URL into iframe embed metadata. */
export function getSpotifyEmbed(input: string | null | undefined): SpotifyEmbedInfo | null {
  const raw = input?.trim()
  if (!raw) return null

  if (raw.startsWith('spotify:')) {
    return parseSpotifyUri(raw)
  }

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'open.spotify.com') {
      if (url.pathname.startsWith('/embed/')) {
        const embedSegments = url.pathname.split('/').filter(Boolean)
        if (embedSegments.length >= 3 && isSpotifyEmbedType(embedSegments[1])) {
          const type = embedSegments[1]
          const id = embedSegments[2]?.split('?')[0] ?? ''
          if (isLikelySpotifyId(id)) return buildEmbedInfo(type, id)
        }
      }
      return parseSpotifyPath(url.pathname)
    }
  } catch {
    return null
  }

  return null
}

type SpotifyOEmbedResponse = {
  height?: number
  width?: number
  title?: string
  iframe_url?: string
}

/** Resolve embed height from Spotify oEmbed (falls back to defaults). */
export async function resolveSpotifyEmbed(
  input: string | null | undefined,
): Promise<SpotifyEmbedInfo | null> {
  const embed = getSpotifyEmbed(input)
  if (!embed) return null

  const shareUrl = embed.listenUrl
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(shareUrl)}`,
      {next: {revalidate: 60 * 60 * 24}},
    )
    if (!res.ok) return embed

    const data = (await res.json()) as SpotifyOEmbedResponse
    const height =
      typeof data.height === 'number' && data.height > 0 ? data.height : embed.height
    const width =
      typeof data.width === 'number' && data.width > 0 ? data.width : embed.width

    return {...embed, height, width}
  } catch {
    return embed
  }
}

export function spotifyEmbedTypeLabel(type: SpotifyEmbedType): string {
  switch (type) {
    case 'track':
      return 'Track'
    case 'album':
      return 'Album'
    case 'playlist':
      return 'Playlist'
    case 'artist':
      return 'Artist'
    case 'episode':
      return 'Episode'
    case 'show':
      return 'Show'
  }
}
