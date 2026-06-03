/** Server-only Spotify dashboard metrics (Web API + Sanity cache). */

import {
  getSpotifyClientIdFingerprint,
  isSpotifyApiConfigured,
  verifySpotifyApiConnection,
} from '@/lib/spotifyApi'
import {SPOTIFY_CURATION_VERSION} from '@/lib/spotifyCurationVersion'
import {getSanityServerClient} from '@/sanity/lib/serverClient'

type SpotifyCacheStats = {
  artistMatchesTotal: number
  artistMatched: number
  artistAmbiguous: number
  artistNotFound: number
  artistStale: number
  eventCurationsTotal: number
  eventCurationsStale: number
  embedsPlanned: number
  lastArtistResolvedAt: string | null
  lastEventCuratedAt: string | null
}

const CACHE_STATS_QUERY = `{
  "artistMatchesTotal": count(*[_type == "spotifyArtistMatch"]),
  "artistMatched": count(*[_type == "spotifyArtistMatch" && matchStatus == "matched"]),
  "artistAmbiguous": count(*[_type == "spotifyArtistMatch" && matchStatus == "ambiguous"]),
  "artistNotFound": count(*[_type == "spotifyArtistMatch" && matchStatus == "not_found"]),
  "artistStale": count(*[_type == "spotifyArtistMatch" && (curationVersion < $version || !defined(curationVersion))]),
  "eventCurationsTotal": count(*[_type == "eventSpotifyCuration"]),
  "eventCurationsStale": count(*[_type == "eventSpotifyCuration" && (curationVersion < $version || !defined(curationVersion))]),
  "embedsPlanned": count(*[_type == "eventSpotifyCuration"].artists[includeEmbed == true]),
  "lastArtistResolvedAt": *[_type == "spotifyArtistMatch" && defined(resolvedAt)] | order(resolvedAt desc)[0].resolvedAt,
  "lastEventCuratedAt": *[_type == "eventSpotifyCuration" && defined(curatedAt)] | order(curatedAt desc)[0].curatedAt
}`

export type SpotifyUsageSummary = {
  fetchedAt: string
  apiConfigured: boolean
  apiConnectionStatus: 'ok' | 'not_configured' | 'auth_failed'
  clientIdFingerprint: string | null
  openAiCurationConfigured: boolean
  curationVersion: number
  syncMaxEventsPerRun: number
  artistMatchesTotal: number
  artistMatched: number
  artistAmbiguous: number
  artistNotFound: number
  artistStale: number
  eventCurationsTotal: number
  eventCurationsStale: number
  embedsPlanned: number
  lastArtistResolvedAt: string | null
  lastEventCuratedAt: string | null
  dashboardUrl: string
  documentationUrl: string
}

function syncMaxEventsPerRun(): number {
  const raw = process.env.SPOTIFY_SYNC_MAX_EVENTS_PER_RUN?.trim()
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), 50)
  }
  return 5
}

export async function fetchSpotifyUsageSummary(): Promise<SpotifyUsageSummary> {
  const apiConfigured = isSpotifyApiConfigured()
  const connection = apiConfigured ? await verifySpotifyApiConnection() : {status: 'not_configured' as const}

  let cache: SpotifyCacheStats = {
    artistMatchesTotal: 0,
    artistMatched: 0,
    artistAmbiguous: 0,
    artistNotFound: 0,
    artistStale: 0,
    eventCurationsTotal: 0,
    eventCurationsStale: 0,
    embedsPlanned: 0,
    lastArtistResolvedAt: null,
    lastEventCuratedAt: null,
  }

  try {
    cache = await getSanityServerClient().fetch<SpotifyCacheStats>(CACHE_STATS_QUERY, {
      version: SPOTIFY_CURATION_VERSION,
    })
  } catch (error) {
    console.warn('[spotify] Failed to load Sanity cache stats:', error)
  }

  return {
    fetchedAt: new Date().toISOString(),
    apiConfigured,
    apiConnectionStatus: connection.status,
    clientIdFingerprint: getSpotifyClientIdFingerprint(),
    openAiCurationConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    curationVersion: SPOTIFY_CURATION_VERSION,
    syncMaxEventsPerRun: syncMaxEventsPerRun(),
    artistMatchesTotal: cache.artistMatchesTotal,
    artistMatched: cache.artistMatched,
    artistAmbiguous: cache.artistAmbiguous,
    artistNotFound: cache.artistNotFound,
    artistStale: cache.artistStale,
    eventCurationsTotal: cache.eventCurationsTotal,
    eventCurationsStale: cache.eventCurationsStale,
    embedsPlanned: cache.embedsPlanned,
    lastArtistResolvedAt: cache.lastArtistResolvedAt,
    lastEventCuratedAt: cache.lastEventCuratedAt,
    dashboardUrl: 'https://developer.spotify.com/dashboard',
    documentationUrl: 'https://developer.spotify.com/documentation/web-api',
  }
}
