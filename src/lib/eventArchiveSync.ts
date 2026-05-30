import {
  upsertEventArchiveDocumentsFromDetails,
} from '@/lib/eventArchive'
import type {EventDetail} from '@/lib/ticketmaster'
import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'
import {loadTicketmasterFeedDirect, type ScheduleEvent, type VenueMapPin} from '@/lib/ticketmaster'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'
import type {TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'
import type {EventPresale} from '@/lib/ticketmaster'

/** Compact feed row stored on Site Settings between syncs (for drop detection). */
export type TicketmasterFeedSnapshotEntry = {
  slug: string
  eventId: string
  name: string
  url: string
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  startDateTime: string | null
  localDate: string | null
  localTime: string | null
  timezone: string | null
  venueId: string | null
  venueName: string | null
  venueCity: string | null
  venueState: string | null
  venueSlug: string | null
  attractions: TicketmasterAttractionRef[]
  info: string | null
  pleaseNote: string | null
  description: string | null
  genreLabels: string[]
  eventTypeLabel: string | null
  priceSummary: string | null
  statusLabel: string | null
  promoterNames: string[]
  accessibilityInfo: string | null
  ticketLimitInfo: string | null
  venueAddress: string | null
  venueUrl: string | null
  salesPublicStart: string | null
  salesPublicEnd: string | null
  presales: EventPresale[]
}

const FEED_SNAPSHOT_QUERY = `*[_id == $id][0].ticketmasterFeedSnapshot`

function snapshotFromDetail(
  detail: EventDetail,
  venueSlug: string | null,
): TicketmasterFeedSnapshotEntry {
  return {
    slug: detail.slug,
    eventId: detail.id,
    name: detail.name,
    url: detail.url,
    imageUrl: detail.imageUrl,
    imageWidth: detail.imageWidth,
    imageHeight: detail.imageHeight,
    startDateTime: detail.startDateTime,
    localDate: detail.localDate,
    localTime: detail.localTime,
    timezone: detail.timezone,
    venueId: detail.venueId,
    venueName: detail.venueName,
    venueCity: detail.venueCity,
    venueState: detail.venueState,
    venueSlug,
    attractions: detail.attractions,
    info: detail.info,
    pleaseNote: detail.pleaseNote,
    description: detail.description,
    genreLabels: detail.genreLabels,
    eventTypeLabel: detail.eventTypeLabel,
    priceSummary: detail.priceSummary,
    statusLabel: detail.statusLabel,
    promoterNames: detail.promoterNames,
    accessibilityInfo: detail.accessibilityInfo,
    ticketLimitInfo: detail.ticketLimitInfo,
    venueAddress: detail.venueAddress,
    venueUrl: detail.venueUrl,
    salesPublicStart: detail.salesPublicStart,
    salesPublicEnd: detail.salesPublicEnd,
    presales: detail.presales,
  }
}

function normalizeSnapshotEntry(
  entry: Partial<TicketmasterFeedSnapshotEntry> & Pick<TicketmasterFeedSnapshotEntry, 'slug' | 'eventId' | 'name' | 'url'>,
): TicketmasterFeedSnapshotEntry {
  return {
    slug: entry.slug,
    eventId: entry.eventId,
    name: entry.name,
    url: entry.url,
    imageUrl: entry.imageUrl ?? null,
    imageWidth: entry.imageWidth ?? null,
    imageHeight: entry.imageHeight ?? null,
    startDateTime: entry.startDateTime ?? null,
    localDate: entry.localDate ?? null,
    localTime: entry.localTime ?? null,
    timezone: entry.timezone ?? null,
    venueId: entry.venueId ?? null,
    venueName: entry.venueName ?? null,
    venueCity: entry.venueCity ?? null,
    venueState: entry.venueState ?? null,
    venueSlug: entry.venueSlug ?? null,
    attractions: entry.attractions ?? [],
    info: entry.info ?? null,
    pleaseNote: entry.pleaseNote ?? null,
    description: entry.description ?? null,
    genreLabels: entry.genreLabels ?? [],
    eventTypeLabel: entry.eventTypeLabel ?? null,
    priceSummary: entry.priceSummary ?? null,
    statusLabel: entry.statusLabel ?? null,
    promoterNames: entry.promoterNames ?? [],
    accessibilityInfo: entry.accessibilityInfo ?? null,
    ticketLimitInfo: entry.ticketLimitInfo ?? null,
    venueAddress: entry.venueAddress ?? null,
    venueUrl: entry.venueUrl ?? null,
    salesPublicStart: entry.salesPublicStart ?? null,
    salesPublicEnd: entry.salesPublicEnd ?? null,
    presales: entry.presales ?? [],
  }
}

function eventDetailFromSnapshot(entry: TicketmasterFeedSnapshotEntry): EventDetail {
  return {
    id: entry.eventId,
    slug: entry.slug,
    name: entry.name,
    url: entry.url,
    imageUrl: entry.imageUrl,
    imageWidth: entry.imageWidth,
    imageHeight: entry.imageHeight,
    startDateTime: entry.startDateTime,
    localDate: entry.localDate,
    localTime: entry.localTime,
    timezone: entry.timezone,
    venueId: entry.venueId,
    venueName: entry.venueName,
    venueCity: entry.venueCity,
    venueState: entry.venueState,
    attractions: entry.attractions,
    pleaseNote: entry.pleaseNote,
    info: entry.info,
    description: entry.description,
    priceSummary: entry.priceSummary,
    statusLabel: entry.statusLabel,
    genreLabels: entry.genreLabels,
    eventTypeLabel: entry.eventTypeLabel,
    promoterNames: entry.promoterNames,
    accessibilityInfo: entry.accessibilityInfo,
    ticketLimitInfo: entry.ticketLimitInfo,
    seatmapUrl: null,
    venueAddress: entry.venueAddress,
    venueUrl: entry.venueUrl,
    salesPublicStart: entry.salesPublicStart,
    salesPublicEnd: entry.salesPublicEnd,
    presales: entry.presales,
  }
}

async function loadFeedSnapshot(
  writeClient: NonNullable<ReturnType<typeof getSanityWriteClient>>,
): Promise<TicketmasterFeedSnapshotEntry[]> {
  const rows = await writeClient.fetch<TicketmasterFeedSnapshotEntry[] | null>(FEED_SNAPSHOT_QUERY, {
    id: SITE_SETTINGS_DOCUMENT_ID,
  })
  return (rows ?? []).map((entry) => normalizeSnapshotEntry(entry))
}

/** Last successful feed slugs from Site Settings (written after each live feed sync). */
export async function loadFeedSnapshotFromSiteSettings(): Promise<TicketmasterFeedSnapshotEntry[]> {
  const rows = await getSanityServerClient().fetch<TicketmasterFeedSnapshotEntry[] | null>(
    FEED_SNAPSHOT_QUERY,
    {id: SITE_SETTINGS_DOCUMENT_ID},
  )
  return (rows ?? []).map((entry) => normalizeSnapshotEntry(entry))
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
  detailsById: Map<string, EventDetail>,
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
    const toArchive = dropped.map((entry) => eventDetailFromSnapshot(entry))
    const droppedVenueSlugs = new Map(
      dropped.filter((entry) => entry.venueId && entry.venueSlug).map((entry) => [entry.venueId!, entry.venueSlug!]),
    )
    const venueSlugLookup = new Map([...venueSlugById, ...droppedVenueSlugs])
    await upsertEventArchiveDocumentsFromDetails(toArchive, venueSlugLookup)
  }

  const pruned = await deleteEventArchivesForLiveSlugs(liveSlugs)

  const snapshot = events.map((event) => {
    const detail = detailsById.get(event.id)
    const venueSlug = event.venueId ? (venueSlugById.get(event.venueId) ?? null) : null
    if (detail) return snapshotFromDetail(detail, venueSlug)
    return normalizeSnapshotEntry({
      slug: event.slug,
      eventId: event.id,
      name: event.name,
      url: event.url,
      imageUrl: event.imageUrl,
      imageWidth: event.imageWidth,
      imageHeight: event.imageHeight,
      startDateTime: event.startDateTime,
      localDate: event.localDate,
      localTime: event.localTime,
      timezone: event.timezone,
      venueId: event.venueId,
      venueName: event.venueName,
      venueCity: event.venueCity,
      venueState: event.venueState,
      venueSlug,
      attractions: event.attractions,
    })
  })

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

export {eventDetailFromSnapshot, snapshotFromDetail}
