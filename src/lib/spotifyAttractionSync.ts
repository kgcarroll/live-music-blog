import type {EventSpotifyCurationInput} from '@/lib/spotifyArtistCuration'
import {
  eventSpotifyCurationDocument,
  isEventCurationStale,
  loadEventCurationVersions,
  upsertEventSpotifyCurationDocuments,
} from '@/lib/eventSpotifyCuration'
import {curateEventSpotifyArtists} from '@/lib/spotifyArtistCuration'
import {
  loadSpotifyMatchSnapshots,
  needsSpotifySearch,
  spotifyArtistMatchDocument,
  type TicketmasterAttractionRef,
  upsertSpotifyArtistMatchDocuments,
} from '@/lib/spotifyArtistMatch'
import {isSpotifyApiConfigured, searchSpotifyArtistByName, SpotifyApiRateLimitError} from '@/lib/spotifyApi'

const RESOLVE_DELAY_MS = 500

export type SpotifyArtistSyncOptions = {
  /** Re-run OpenAI curation even when version is current. */
  forceRecuration?: boolean
  /** Only process events with 2+ attractions. */
  multiArtistOnly?: boolean
  /** Max events to process this run. */
  maxEvents?: number
  /** OpenAI curation only — skip Spotify searches (use when rate limited). */
  skipSpotifySearch?: boolean
}

export type SpotifyArtistSyncResult = {
  eventsProcessed: number
  curationsWritten: number
  matchesWritten: number
  rateLimited: boolean
  retryAfterMs?: number
}

function maxEventsPerSync(options: SpotifyArtistSyncOptions): number {
  if (options.maxEvents != null && options.maxEvents > 0) {
    return Math.min(Math.floor(options.maxEvents), 50)
  }
  const raw = process.env.SPOTIFY_SYNC_MAX_EVENTS_PER_RUN?.trim()
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), 50)
  }
  return 5
}

function filterEventsForSync(
  events: EventSpotifyCurationInput[],
  options: SpotifyArtistSyncOptions,
): EventSpotifyCurationInput[] {
  let list = events.filter((event) => event.attractions.length > 0)
  if (options.multiArtistOnly) {
    list = list.filter((event) => event.attractions.length >= 2)
  }
  return list
}

async function selectEventsToProcess(
  events: EventSpotifyCurationInput[],
  options: SpotifyArtistSyncOptions,
): Promise<EventSpotifyCurationInput[]> {
  const candidates = filterEventsForSync(events, options)
  if (!candidates.length) return []

  if (options.forceRecuration) {
    return candidates.slice(0, maxEventsPerSync(options))
  }

  const versions = await loadEventCurationVersions(candidates.map((event) => event.eventId))
  const stale = candidates.filter((event) =>
    isEventCurationStale(versions.get(event.eventId), false),
  )

  return stale.slice(0, maxEventsPerSync(options))
}

function attractionRefFromCuration(
  event: EventSpotifyCurationInput,
  attractionId: string,
): TicketmasterAttractionRef | null {
  return event.attractions.find((attraction) => attraction.id === attractionId) ?? null
}

/** Curate events with OpenAI, resolve Spotify matches, cache in Sanity. */
export async function syncSpotifyArtistMatchesOnFeed(
  events: EventSpotifyCurationInput[],
  options: SpotifyArtistSyncOptions = {},
): Promise<SpotifyArtistSyncResult> {
  if (!options.skipSpotifySearch && !isSpotifyApiConfigured()) {
    return {eventsProcessed: 0, curationsWritten: 0, matchesWritten: 0, rateLimited: false}
  }

  const pending = await selectEventsToProcess(events, options)
  if (!pending.length) {
    return {eventsProcessed: 0, curationsWritten: 0, matchesWritten: 0, rateLimited: false}
  }

  let curationsWritten = 0
  let matchesWritten = 0
  let rateLimited = false
  let retryAfterMs: number | undefined
  let eventsProcessed = 0

  for (const event of pending) {
    try {
      const curated = await curateEventSpotifyArtists(event)

      await upsertEventSpotifyCurationDocuments([
        eventSpotifyCurationDocument(event.eventId, event.eventName, curated),
      ])
      curationsWritten += 1
      eventsProcessed += 1

      if (options.skipSpotifySearch) {
        continue
      }

      const toSearch = curated.filter((row) => row.includeEmbed && row.spotifySearchQuery?.trim())
      const existingMatches = await loadSpotifyMatchSnapshots(
        toSearch.map((row) => row.ticketmasterAttractionId),
      )

      const matchDocs = []
      for (const row of toSearch) {
        const attraction = attractionRefFromCuration(event, row.ticketmasterAttractionId)
        if (!attraction) continue

        const searchQuery = row.spotifySearchQuery!.trim()
        const existing = existingMatches.get(row.ticketmasterAttractionId)

        if (!needsSpotifySearch(existing, searchQuery)) {
          continue
        }

        try {
          const result = await searchSpotifyArtistByName(searchQuery)
          matchDocs.push(
            spotifyArtistMatchDocument(attraction, {
              spotifyArtistId: result.artistId || null,
              spotifyArtistUrl: result.artistUrl || null,
              spotifySearchQuery: searchQuery,
              matchStatus: result.matchStatus,
            }),
          )
        } catch (error) {
          if (error instanceof SpotifyApiRateLimitError) {
            rateLimited = true
            retryAfterMs = error.retryAfterMs
            break
          }
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, RESOLVE_DELAY_MS))
      }

      if (matchDocs.length) {
        matchesWritten += await upsertSpotifyArtistMatchDocuments(matchDocs)
      }

      if (rateLimited) break
    } catch (error) {
      if (error instanceof SpotifyApiRateLimitError) {
        rateLimited = true
        retryAfterMs = error.retryAfterMs
        break
      }
      console.warn(`[spotify] Failed to sync event ${event.eventId}:`, error)
    }
  }

  if (curationsWritten || matchesWritten) {
    console.info(
      `[spotify] sync: ${eventsProcessed} event(s), ${curationsWritten} curation(s), ${matchesWritten} match(es).`,
    )
  }

  return {eventsProcessed, curationsWritten, matchesWritten, rateLimited, retryAfterMs}
}
