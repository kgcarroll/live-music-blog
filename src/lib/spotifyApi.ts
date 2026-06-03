/** Server-only Spotify Web API (Client Credentials). */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_BASE = 'https://api.spotify.com/v1'

type SpotifyTokenResponse = {
  access_token?: string
  expires_in?: number
  token_type?: string
}

type SpotifySearchArtistItem = {
  id?: string
  name?: string
  popularity?: number
  external_urls?: {spotify?: string}
}

type SpotifySearchArtistsResponse = {
  artists?: {items?: SpotifySearchArtistItem[]}
}

export class SpotifyApiRateLimitError extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super('spotify_rate_limit')
    this.name = 'SpotifyApiRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

let cachedToken: {value: string; expiresAt: number} | null = null

/** Dev-mode search quota is tight; space requests to avoid 429 bursts. */
const MIN_REQUEST_INTERVAL_MS = 2500
let lastApiRequestAt = 0

async function waitForRequestSlot(): Promise<void> {
  const elapsed = Date.now() - lastApiRequestAt
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed))
  }
  lastApiRequestAt = Date.now()
}

function retryAfterMs(res: Response, attempt: number): number {
  const header = res.headers.get('Retry-After')
  const seconds = header ? Number(header) : NaN
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 60_000)
  }
  // Exponential backoff when Spotify omits Retry-After
  return Math.min(2000 * 2 ** attempt, 30_000)
}

function getCredentials(): {clientId: string; clientSecret: string} | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim()
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return {clientId, clientSecret}
}

export function isSpotifyApiConfigured(): boolean {
  return getCredentials() != null
}

export function getSpotifyClientIdFingerprint(): string | null {
  const clientId = getCredentials()?.clientId
  if (!clientId || clientId.length < 8) return clientId ?? null
  return `${clientId.slice(0, 8)}…`
}

/** Verify Client Credentials can obtain an access token (no search quota used). */
export async function verifySpotifyApiConnection(): Promise<
  {status: 'ok'} | {status: 'not_configured'} | {status: 'auth_failed'}
> {
  if (!getCredentials()) return {status: 'not_configured'}
  const token = await fetchAccessToken()
  return token ? {status: 'ok'} : {status: 'auth_failed'}
}

export function formatSpotifyRateLimitMessage(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000)
  const minutes = Math.ceil(seconds / 60)
  const wait =
    seconds >= 120
      ? `about ${minutes} minutes`
      : seconds >= 60
        ? 'about 1 minute'
        : `${seconds} seconds`
  return (
    `Spotify rate limited your app (common in Dev mode after bulk syncs). ` +
    `Wait ${wait}, then run:\n` +
    `  npm run spotify-artist:sync\n` +
    `Or curate without Spotify:\n` +
    `  npm run spotify-artist:recurate -- --curate-only --multi-artist-only --force --limit 20\n` +
    `Tip: run sync a few times per hour, not hundreds of artists at once.`
  )
}

async function fetchAccessToken(): Promise<string | null> {
  const creds = getCredentials()
  if (!creds) return null

  const body = new URLSearchParams({grant_type: 'client_credentials'})
  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    console.warn('[spotify] token request failed:', res.status)
    return null
  }

  const data = (await res.json()) as SpotifyTokenResponse
  const value = data.access_token?.trim()
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600
  if (!value) return null

  cachedToken = {
    value,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  }
  return value
}

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }
  return fetchAccessToken()
}

function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .trim()
}

function artistNamesLikelyMatch(query: string, candidate: string): boolean {
  const a = normalizeArtistName(query)
  const b = normalizeArtistName(candidate)
  if (!a || !b) return false
  if (a === b) return true
  // Avoid matching short names via substring ("Delirious" → "Delirious?")
  if (a.length < 8 || b.length < 8) return false
  if (a.includes(b) || b.includes(a)) return true
  return false
}

function pickBestArtistMatch(
  query: string,
  items: (SpotifySearchArtistItem & {id: string; name: string})[],
): (SpotifySearchArtistItem & {id: string; name: string}) | null {
  if (!items.length) return null

  const exact = items.filter((item) => normalizeArtistName(query) === normalizeArtistName(item.name))
  const pool = exact.length ? exact : items.filter((item) => artistNamesLikelyMatch(query, item.name))

  if (!pool.length) return null
  if (pool.length === 1) return pool[0]!

  return [...pool].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]!
}

export type SpotifyArtistSearchMatch = {
  artistId: string
  artistName: string
  artistUrl: string
  matchStatus: 'matched' | 'ambiguous' | 'not_found'
}

async function spotifyFetch(path: string, attempt = 0): Promise<Response | null> {
  const token = await getAccessToken()
  if (!token) return null

  await waitForRequestSlot()

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {Authorization: `Bearer ${token}`},
  })

  if (res.status === 401 && attempt === 0) {
    cachedToken = null
    return spotifyFetch(path, 1)
  }

  if (res.status === 429) {
    const waitMs = retryAfterMs(res, attempt)
    // Only auto-retry on short Retry-After (transient). Dev mode often returns 60s+ — fail fast.
    if (attempt === 0 && waitMs <= 5000) {
      console.warn(`[spotify] rate limited; waiting ${Math.round(waitMs / 1000)}s…`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return spotifyFetch(path, 1)
    }
    throw new SpotifyApiRateLimitError(waitMs)
  }

  return res
}

/** Search Spotify for an artist by Ticketmaster attraction name. */
export async function searchSpotifyArtistByName(
  attractionName: string,
): Promise<SpotifyArtistSearchMatch> {
  const query = attractionName.trim()
  if (!query) {
    return {artistId: '', artistName: '', artistUrl: '', matchStatus: 'not_found'}
  }

  if (!isSpotifyApiConfigured()) {
    return {artistId: '', artistName: '', artistUrl: '', matchStatus: 'not_found'}
  }

  const params = new URLSearchParams({
    q: query,
    type: 'artist',
    limit: '5',
  })

  let res: Response | null
  try {
    res = await spotifyFetch(`/search?${params}`)
  } catch (error) {
    if (error instanceof SpotifyApiRateLimitError) throw error
    res = null
  }

  if (!res) {
    return {artistId: '', artistName: '', artistUrl: '', matchStatus: 'not_found'}
  }

  if (res.status === 429) {
    throw new SpotifyApiRateLimitError(retryAfterMs(res, 0))
  }

  if (!res.ok) {
    console.warn('[spotify] search failed:', res.status, query)
    return {artistId: '', artistName: '', artistUrl: '', matchStatus: 'not_found'}
  }

  const data = (await res.json()) as SpotifySearchArtistsResponse
  const items = data.artists?.items ?? []
  const viable = items.filter(
    (item): item is SpotifySearchArtistItem & {id: string; name: string} =>
      Boolean(item.id?.trim() && item.name?.trim()),
  )

  if (!viable.length) {
    return {artistId: '', artistName: '', artistUrl: '', matchStatus: 'not_found'}
  }

  const best = pickBestArtistMatch(query, viable)
  if (best) {
    const id = best.id.trim()
    return {
      artistId: id,
      artistName: best.name.trim(),
      artistUrl: best.external_urls?.spotify?.trim() || `https://open.spotify.com/artist/${id}`,
      matchStatus: 'matched',
    }
  }

  if (viable.length === 1) {
    const only = viable[0]
    const id = only.id.trim()
    return {
      artistId: id,
      artistName: only.name.trim(),
      artistUrl: only.external_urls?.spotify?.trim() || `https://open.spotify.com/artist/${id}`,
      matchStatus: 'ambiguous',
    }
  }

  return {artistId: '', artistName: '', artistUrl: '', matchStatus: 'ambiguous'}
}
