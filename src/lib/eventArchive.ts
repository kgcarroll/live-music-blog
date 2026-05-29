import type {ScheduleEvent, VenueMapPin} from '@/lib/ticketmaster'
import {EVENT_ARCHIVE_BY_DOC_ID, EVENT_ARCHIVE_BY_SLUG} from '@/sanity/lib/queries'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

/** Public reads; never use dotted `_id` paths (see eventArchiveDocId). */
const archiveReadClient = getSanityServerClient().withConfig({useCdn: false})

const EVENT_ARCHIVE_ID_PREFIX = 'eventArchive-'

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
  ticketmasterUrl: string | null
  imageUrl: string | null
  lastSeenAt: string | null
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
  return {
    id: archive.eventId,
    slug: archive.slug,
    name: archive.name,
    url: archive.ticketmasterUrl ?? '',
    imageUrl: archive.imageUrl,
    imageWidth: null,
    imageHeight: null,
    startDateTime: archive.startDateTime,
    localDate: archive.localDate,
    localTime: archive.localTime,
    timezone: null,
    venueId: archive.venueId,
    venueName: archive.venueName,
    venueCity: archive.venueCity,
    venueState: archive.venueState,
    attractions: [],
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

