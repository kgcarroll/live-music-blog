import {
  eventArchiveDocId,
  eventArchiveDocumentFromEvent,
  upsertEventArchiveDocuments,
} from '@/lib/eventArchive'
import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'
import {loadTicketmasterFeedDirect, type ScheduleEvent, type VenueMapPin} from '@/lib/ticketmaster'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

/** Compact feed row stored on Site Settings between syncs (for drop detection). */
export type TicketmasterFeedSnapshotEntry = {
  slug: string
  eventId: string
  name: string
  url: string
  imageUrl: string | null
  startDateTime: string | null
  localDate: string | null
  localTime: string | null
  venueId: string | null
  venueName: string | null
  venueCity: string | null
  venueState: string | null
  venueSlug: string | null
}

const FEED_SNAPSHOT_QUERY = `*[_id == $id][0].ticketmasterFeedSnapshot`

function snapshotFromEvent(
  event: ScheduleEvent,
  venueSlugById: Map<string, string>,
): TicketmasterFeedSnapshotEntry {
  return {
    slug: event.slug,
    eventId: event.id,
    name: event.name,
    url: event.url,
    imageUrl: event.imageUrl,
    startDateTime: event.startDateTime,
    localDate: event.localDate,
    localTime: event.localTime,
    venueId: event.venueId,
    venueName: event.venueName,
    venueCity: event.venueCity,
    venueState: event.venueState,
    venueSlug: event.venueId ? (venueSlugById.get(event.venueId) ?? null) : null,
  }
}

function scheduleEventFromSnapshot(entry: TicketmasterFeedSnapshotEntry): ScheduleEvent {
  return {
    id: entry.eventId,
    slug: entry.slug,
    name: entry.name,
    url: entry.url,
    imageUrl: entry.imageUrl,
    imageWidth: null,
    imageHeight: null,
    startDateTime: entry.startDateTime,
    localDate: entry.localDate,
    localTime: entry.localTime,
    timezone: null,
    venueId: entry.venueId,
    venueName: entry.venueName,
    venueCity: entry.venueCity,
    venueState: entry.venueState,
  }
}

async function loadFeedSnapshot(
  writeClient: NonNullable<ReturnType<typeof getSanityWriteClient>>,
): Promise<TicketmasterFeedSnapshotEntry[]> {
  const rows = await writeClient.fetch<TicketmasterFeedSnapshotEntry[] | null>(FEED_SNAPSHOT_QUERY, {
    id: SITE_SETTINGS_DOCUMENT_ID,
  })
  return rows ?? []
}

/** Last successful feed slugs from Site Settings (written after each live feed sync). */
export async function loadFeedSnapshotFromSiteSettings(): Promise<TicketmasterFeedSnapshotEntry[]> {
  const rows = await getSanityServerClient().fetch<TicketmasterFeedSnapshotEntry[] | null>(
    FEED_SNAPSHOT_QUERY,
    {id: SITE_SETTINGS_DOCUMENT_ID},
  )
  return rows ?? []
}

/** Live slugs for prune scripts: Ticketmaster API first, then stored feed snapshot. */
export async function resolveLiveEventSlugsForPrune(): Promise<{
  slugs: string[]
  source: 'ticketmaster' | 'snapshot'
}> {
  const feed = await loadTicketmasterFeedDirect()
  if (!feed.error && feed.events.length > 0) {
    return {slugs: feed.events.map((event) => event.slug), source: 'ticketmaster'}
  }

  const snapshot = await loadFeedSnapshotFromSiteSettings()
  if (snapshot.length > 0) {
    return {slugs: snapshot.map((entry) => entry.slug), source: 'snapshot'}
  }

  const reason = feed.error ?? 'empty feed'
  throw new Error(
    `Could not load live event slugs (Ticketmaster: ${reason}; no ticketmasterFeedSnapshot in Site Settings). ` +
      'Visit /events on the running site once to refresh the snapshot, or retry when the API is available.',
  )
}

async function deleteEventArchivesByIds(ids: string[]): Promise<void> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || ids.length === 0) return

  const batchSize = 50
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const transaction = writeClient.transaction()
    for (const id of batch) {
      transaction.delete(id)
    }
    await transaction.commit({visibility: 'async'})
  }
}

/** Remove archive docs for concerts still in the live Ticketmaster feed. */
export async function deleteEventArchivesForLiveSlugs(liveSlugs: string[]): Promise<number> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || liveSlugs.length === 0) return 0

  const ids = await writeClient.fetch<string[]>(
    `*[_type == "eventArchive" && slug in $slugs]._id`,
    {slugs: liveSlugs},
  )
  await deleteEventArchivesByIds(ids)
  return ids.length
}

/**
 * After a successful feed load: archive concerts that left the feed, prune archives
 * for concerts still listed, and store the new snapshot for the next diff.
 */
export async function syncEventArchivesOnFeedUpdate(
  events: ScheduleEvent[],
  venues: VenueMapPin[],
): Promise<void> {
  const writeClient = getSanityWriteClient()
  if (!writeClient) {
    console.warn('[eventArchive] SANITY_API_WRITE_TOKEN not set; feed archive sync skipped.')
    return
  }

  const venueSlugById = new Map(venues.map((venue) => [venue.id, venue.slug]))
  const currentById = new Map(events.map((event) => [event.id, event]))
  const liveSlugs = events.map((event) => event.slug)

  const previous = await loadFeedSnapshot(writeClient)
  const dropped = previous.filter((entry) => !currentById.has(entry.eventId))

  if (dropped.length) {
    const toArchive = dropped.map(scheduleEventFromSnapshot)
    const droppedVenueSlugs = new Map(
      dropped.filter((entry) => entry.venueId && entry.venueSlug).map((entry) => [entry.venueId!, entry.venueSlug!]),
    )
    const venueSlugLookup = new Map([...venueSlugById, ...droppedVenueSlugs])
    await upsertEventArchiveDocuments(toArchive, venueSlugLookup)
  }

  const pruned = await deleteEventArchivesForLiveSlugs(liveSlugs)

  const snapshot = events.map((event) => snapshotFromEvent(event, venueSlugById))
  await writeClient
    .patch(SITE_SETTINGS_DOCUMENT_ID)
    .set({ticketmasterFeedSnapshot: snapshot})
    .commit({visibility: 'async'})

  if (dropped.length || pruned) {
    console.info(
      `[eventArchive] sync: archived ${dropped.length} dropped, pruned ${pruned} still-live archive(s).`,
    )
  }
}
