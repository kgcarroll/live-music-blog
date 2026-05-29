import type {CuratedSpotifyArtist} from '@/lib/spotifyArtistCuration'
import {SPOTIFY_CURATION_VERSION} from '@/lib/spotifyCurationVersion'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

export type EventSpotifyCurationRecord = {
  eventId: string
  eventName: string | null
  curationVersion: number | null
  curatedAt: string | null
  artists: CuratedSpotifyArtist[]
}

const CURATION_ID_PREFIX = 'eventSpotifyCuration-'

export function eventSpotifyCurationDocId(eventId: string): string {
  const safe = eventId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 200)
  return `${CURATION_ID_PREFIX}${safe}`
}

const CURATION_BY_EVENT_ID = `*[_type == "eventSpotifyCuration" && eventId == $eventId][0]{
  eventId,
  eventName,
  curationVersion,
  curatedAt,
  artists[]{
    ticketmasterAttractionId,
    attractionName,
    displayOrder,
    includeEmbed,
    spotifySearchQuery,
    skipReason
  }
}`

const CURATION_VERSIONS_BY_EVENT_IDS = `*[
  _type == "eventSpotifyCuration"
  && eventId in $eventIds
]{ eventId, curationVersion }`

export async function fetchEventSpotifyCuration(
  eventId: string,
): Promise<EventSpotifyCurationRecord | null> {
  const id = eventId.trim()
  if (!id) return null

  const row = await getSanityServerClient().fetch<EventSpotifyCurationRecord | null>(
    CURATION_BY_EVENT_ID,
    {eventId: id},
  )
  if (!row?.eventId || !row.artists?.length) return null
  return row
}

export async function loadEventCurationVersions(
  eventIds: string[],
): Promise<Map<string, number>> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || !eventIds.length) return new Map()

  const rows = await writeClient.fetch<{eventId: string; curationVersion: number | null}[]>(
    CURATION_VERSIONS_BY_EVENT_IDS,
    {eventIds},
  )

  return new Map(
    rows
      .filter((row) => row.eventId)
      .map((row) => [row.eventId, row.curationVersion ?? 0]),
  )
}

export function eventSpotifyCurationDocument(
  eventId: string,
  eventName: string,
  artists: CuratedSpotifyArtist[],
) {
  return {
    _id: eventSpotifyCurationDocId(eventId),
    _type: 'eventSpotifyCuration' as const,
    eventId,
    eventName,
    curationVersion: SPOTIFY_CURATION_VERSION,
    curatedAt: new Date().toISOString(),
    artists,
  }
}

export async function upsertEventSpotifyCurationDocuments(
  docs: ReturnType<typeof eventSpotifyCurationDocument>[],
): Promise<number> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || !docs.length) return 0

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

export function isEventCurationStale(
  version: number | null | undefined,
  force = false,
): boolean {
  if (force) return true
  return (version ?? 0) < SPOTIFY_CURATION_VERSION
}
