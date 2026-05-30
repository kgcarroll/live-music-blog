import {
  eventDetailFromArchive,
  hasRichArchiveData,
  mergeEventDetailWithArchive,
} from '@/lib/eventArchiveDetail'
import type {ScheduleEvent, VenueMapPin, EventDetail} from '@/lib/ticketmaster'
import {fetchEventDetailById} from '@/lib/ticketmaster'
import {EVENT_ARCHIVE_BY_DOC_ID, EVENT_ARCHIVE_BY_SLUG} from '@/sanity/lib/queries'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

/** Public reads; never use dotted `_id` paths (see eventArchiveDocId). */
const archiveReadClient = getSanityServerClient().withConfig({useCdn: false})

const EVENT_ARCHIVE_ID_PREFIX = 'eventArchive-'

export type ArchivedAttraction = {
  id: string
  name: string
  url?: string | null
}

export type ArchivedPresale = {
  name: string
  startDateTime?: string | null
  endDateTime?: string | null
}

export type EventArchiveRecord = {
  slug: string
  eventId: string
  name: string
  venueId: string | null
  venueName: string | null
  venueSlug: string | null
  venueCity: string | null
  venueState: string | null
  startDateTime: string | null
  localDate: string | null
  localTime: string | null
  timezone?: string | null
  ticketmasterUrl: string | null
  imageUrl: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  lastSeenAt: string | null
  attractions?: ArchivedAttraction[] | null
  info?: string | null
  pleaseNote?: string | null
  description?: string | null
  genreLabels?: string[] | null
  eventTypeLabel?: string | null
  priceSummary?: string | null
  statusLabel?: string | null
  promoterNames?: string[] | null
  accessibilityInfo?: string | null
  ticketLimitInfo?: string | null
  venueAddress?: string | null
  venueUrl?: string | null
  salesPublicStart?: string | null
  salesPublicEnd?: string | null
  presales?: ArchivedPresale[] | null
}

export function eventArchiveDocId(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 200)
  return `${EVENT_ARCHIVE_ID_PREFIX}${safe}`
}

/** Legacy write path; kept for migration from dotted document ids. */
export function legacyEventArchiveDocId(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 200)
  return `eventArchive.${safe}`
}

export function scheduleEventFromArchive(archive: EventArchiveRecord): ScheduleEvent {
  const detail = eventDetailFromArchive(archive)
  return {
    id: detail.id,
    slug: detail.slug,
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
    attractions: detail.attractions,
  }
}

function isValidArchiveRow(row: EventArchiveRecord | null | undefined): row is EventArchiveRecord {
  return Boolean(row?.slug && row.eventId && row.name)
}

export async function fetchEventArchiveBySlug(slug: string): Promise<EventArchiveRecord | null> {
  const key = decodeURIComponent(slug.trim())
  if (!key) return null

  const bySlug = await archiveReadClient.fetch<EventArchiveRecord | null>(EVENT_ARCHIVE_BY_SLUG, {
    slug: key,
  })
  if (isValidArchiveRow(bySlug)) return bySlug

  const byDocId = await archiveReadClient.fetch<EventArchiveRecord | null>(EVENT_ARCHIVE_BY_DOC_ID, {
    docId: eventArchiveDocId(key),
  })
  if (isValidArchiveRow(byDocId)) return byDocId

  const legacyDocId = legacyEventArchiveDocId(key)
  if (legacyDocId !== eventArchiveDocId(key)) {
    const byLegacyId = await archiveReadClient.fetch<EventArchiveRecord | null>(
      EVENT_ARCHIVE_BY_DOC_ID,
      {docId: legacyDocId},
      {perspective: 'raw'},
    )
    if (isValidArchiveRow(byLegacyId)) return byLegacyId
  }

  return null
}

const ARCHIVE_WRITE_BATCH = 50

function archiveFieldsFromDetail(detail: EventDetail) {
  return {
    timezone: detail.timezone,
    imageWidth: detail.imageWidth,
    imageHeight: detail.imageHeight,
    attractions: detail.attractions.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
    })),
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
    presales: detail.presales.map((row) => ({
      name: row.name,
      startDateTime: row.startDateTime,
      endDateTime: row.endDateTime,
    })),
  }
}

export function eventArchiveDocumentFromEvent(
  event: ScheduleEvent,
  venueSlug: string | null,
  lastSeenAt = new Date().toISOString(),
) {
  return {
    _id: eventArchiveDocId(event.slug),
    _type: 'eventArchive' as const,
    slug: event.slug,
    eventId: event.id,
    name: event.name,
    venueId: event.venueId,
    venueName: event.venueName,
    venueSlug,
    venueCity: event.venueCity,
    venueState: event.venueState,
    startDateTime: event.startDateTime,
    localDate: event.localDate,
    localTime: event.localTime,
    ticketmasterUrl: event.url || null,
    imageUrl: event.imageUrl,
    lastSeenAt,
    timezone: event.timezone,
    attractions: event.attractions.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
    })),
  }
}

export function eventArchiveDocumentFromDetail(
  detail: EventDetail,
  venueSlug: string | null,
  lastSeenAt = new Date().toISOString(),
) {
  return {
    _id: eventArchiveDocId(detail.slug),
    _type: 'eventArchive' as const,
    slug: detail.slug,
    eventId: detail.id,
    name: detail.name,
    venueId: detail.venueId,
    venueName: detail.venueName,
    venueSlug,
    venueCity: detail.venueCity,
    venueState: detail.venueState,
    startDateTime: detail.startDateTime,
    localDate: detail.localDate,
    localTime: detail.localTime,
    ticketmasterUrl: detail.url || null,
    imageUrl: detail.imageUrl,
    lastSeenAt,
    ...archiveFieldsFromDetail(detail),
  }
}

export async function upsertEventArchiveDocuments(
  events: ScheduleEvent[],
  venueSlugById: Map<string, string>,
): Promise<number> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || events.length === 0) return 0

  const docs = events.map((event) =>
    eventArchiveDocumentFromEvent(
      event,
      event.venueId ? (venueSlugById.get(event.venueId) ?? null) : null,
    ),
  )

  for (let i = 0; i < docs.length; i += ARCHIVE_WRITE_BATCH) {
    const batch = docs.slice(i, i + ARCHIVE_WRITE_BATCH)
    const transaction = writeClient.transaction()
    for (const doc of batch) {
      transaction.createOrReplace(doc)
    }
    await transaction.commit({visibility: 'async'})
  }

  return docs.length
}

export async function upsertEventArchiveDocumentsFromDetails(
  details: EventDetail[],
  venueSlugById: Map<string, string>,
): Promise<number> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || details.length === 0) return 0

  const docs = details.map((detail) =>
    eventArchiveDocumentFromDetail(
      detail,
      detail.venueId ? (venueSlugById.get(detail.venueId) ?? null) : null,
    ),
  )

  for (let i = 0; i < docs.length; i += ARCHIVE_WRITE_BATCH) {
    const batch = docs.slice(i, i + ARCHIVE_WRITE_BATCH)
    const transaction = writeClient.transaction()
    for (const doc of batch) {
      transaction.createOrReplace(doc)
    }
    await transaction.commit({visibility: 'async'})
  }

  return docs.length
}

/** Load past-event detail from archive snapshot, with Ticketmaster fallback for legacy rows. */
export async function resolvePastEventDetail(
  archive: EventArchiveRecord,
): Promise<EventDetail> {
  if (hasRichArchiveData(archive)) {
    return eventDetailFromArchive(archive)
  }

  const live = await fetchEventDetailById(archive.eventId)
  if (live && live !== 'not_configured' && live !== 'api_error') {
    return mergeEventDetailWithArchive({...live, slug: archive.slug}, archive)
  }

  return eventDetailFromArchive(archive)
}

export {hasRichArchiveData, eventDetailFromArchive}
