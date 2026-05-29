import {fetchEventSpotifyCuration} from '@/lib/eventSpotifyCuration'
import {SPOTIFY_CURATION_VERSION} from '@/lib/spotifyCurationVersion'
import {getSpotifyEmbed} from '@/lib/spotify'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

export type TicketmasterAttractionRef = {
  id: string
  name: string
  url?: string | null
}

export type SpotifyArtistMatchRecord = {
  ticketmasterAttractionId: string
  attractionName: string | null
  spotifyArtistId: string | null
  spotifyArtistUrl: string | null
  spotifySearchQuery: string | null
  matchStatus: 'matched' | 'ambiguous' | 'not_found' | null
  curationVersion: number | null
}

const MATCH_ID_PREFIX = 'spotifyArtistMatch-'

export function spotifyArtistMatchDocId(attractionId: string): string {
  const safe = attractionId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 200)
  return `${MATCH_ID_PREFIX}${safe}`
}

const MATCHES_BY_ATTRACTION_IDS = `*[
  _type == "spotifyArtistMatch"
  && ticketmasterAttractionId in $ids
]{
  ticketmasterAttractionId,
  attractionName,
  spotifyArtistId,
  spotifyArtistUrl,
  spotifySearchQuery,
  matchStatus,
  curationVersion
}`

const MATCHES_BY_ATTRACTION_IDS_WRITE = `*[
  _type == "spotifyArtistMatch"
  && ticketmasterAttractionId in $ids
]{
  ticketmasterAttractionId,
  spotifySearchQuery,
  matchStatus,
  curationVersion
}`

export async function fetchSpotifyArtistMatches(
  attractionIds: string[],
): Promise<SpotifyArtistMatchRecord[]> {
  const ids = [...new Set(attractionIds.map((id) => id.trim()).filter(Boolean))]
  if (!ids.length) return []

  return getSanityServerClient().fetch<SpotifyArtistMatchRecord[]>(MATCHES_BY_ATTRACTION_IDS, {ids})
}

export async function loadSpotifyMatchSnapshots(
  attractionIds: string[],
): Promise<Map<string, SpotifyArtistMatchRecord>> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || !attractionIds.length) return new Map()

  const rows = await writeClient.fetch<SpotifyArtistMatchRecord[]>(MATCHES_BY_ATTRACTION_IDS_WRITE, {
    ids: attractionIds,
  })

  return new Map(rows.map((row) => [row.ticketmasterAttractionId, row]))
}

export function needsSpotifySearch(
  existing: SpotifyArtistMatchRecord | undefined,
  searchQuery: string,
): boolean {
  if (!existing) return true
  if ((existing.curationVersion ?? 0) < SPOTIFY_CURATION_VERSION) return true
  if (existing.spotifySearchQuery?.trim() !== searchQuery.trim()) return true
  if (existing.matchStatus === 'not_found') return true
  if (existing.matchStatus === 'ambiguous') return true
  return false
}

export function spotifyArtistMatchDocument(
  attraction: TicketmasterAttractionRef,
  resolved: {
    spotifyArtistId: string | null
    spotifyArtistUrl: string | null
    spotifySearchQuery: string | null
    matchStatus: 'matched' | 'ambiguous' | 'not_found'
  },
) {
  const now = new Date().toISOString()
  return {
    _id: spotifyArtistMatchDocId(attraction.id),
    _type: 'spotifyArtistMatch' as const,
    ticketmasterAttractionId: attraction.id,
    attractionName: attraction.name,
    spotifyArtistId: resolved.spotifyArtistId,
    spotifyArtistUrl: resolved.spotifyArtistUrl,
    spotifySearchQuery: resolved.spotifySearchQuery,
    matchStatus: resolved.matchStatus,
    curationVersion: SPOTIFY_CURATION_VERSION,
    resolvedAt: now,
  }
}

export async function upsertSpotifyArtistMatchDocuments(
  docs: ReturnType<typeof spotifyArtistMatchDocument>[],
): Promise<number> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || docs.length === 0) return 0

  const batchSize = 25
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    const transaction = writeClient.transaction()
    for (const doc of batch) {
      transaction.createOrReplace(doc)
    }
    await transaction.commit({visibility: 'async'})
  }

  return docs.length
}

export type EventSpotifyArtistEmbed = {
  attractionName: string
  embed: NonNullable<ReturnType<typeof getSpotifyEmbed>>
}

/** Embeds for curated, matched attractions (no Spotify API calls). */
export async function fetchEventSpotifyArtistEmbeds(
  eventId: string,
  attractions: TicketmasterAttractionRef[],
): Promise<EventSpotifyArtistEmbed[]> {
  if (!attractions.length) return []

  const curation = await fetchEventSpotifyCuration(eventId)
  const ordered = curation?.artists?.length
    ? [...curation.artists]
        .filter((row) => row.includeEmbed)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : attractions.map((attraction, index) => ({
        ticketmasterAttractionId: attraction.id,
        attractionName: attraction.name,
        displayOrder: index + 1,
        includeEmbed: true,
      }))

  if (!ordered.length) return []

  const attractionById = new Map(attractions.map((attraction) => [attraction.id, attraction]))
  const ids = ordered.map((row) => row.ticketmasterAttractionId).filter((id) => attractionById.has(id))
  const matches = await fetchSpotifyArtistMatches(ids)
  const byId = new Map(matches.map((row) => [row.ticketmasterAttractionId, row]))

  const embeds: EventSpotifyArtistEmbed[] = []
  for (const row of ordered) {
    const attraction = attractionById.get(row.ticketmasterAttractionId)
    if (!attraction) continue

    const match = byId.get(row.ticketmasterAttractionId)
    if (match?.matchStatus !== 'matched' || !match.spotifyArtistUrl) continue

    const embed = getSpotifyEmbed(match.spotifyArtistUrl)
    if (!embed) continue

    embeds.push({
      attractionName: row.attractionName?.trim() || match.attractionName?.trim() || attraction.name,
      embed,
    })
  }

  return embeds
}
