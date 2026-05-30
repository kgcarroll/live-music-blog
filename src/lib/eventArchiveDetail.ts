import type {EventArchiveRecord} from '@/lib/eventArchive'
import type {TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'
import type {EventDetail, EventPresale} from '@/lib/ticketmaster'

function archivedAttractions(archive: EventArchiveRecord): TicketmasterAttractionRef[] {
  return (archive.attractions ?? []).flatMap((row) => {
    const id = row.id?.trim()
    const name = row.name?.trim()
    if (!id || !name) return []
    return [{id, name, url: row.url?.trim() || null}]
  })
}

function archivedPresales(archive: EventArchiveRecord): EventPresale[] {
  return (archive.presales ?? []).flatMap((row) => {
    const name = row.name?.trim()
    if (!name) return []
    return [
      {
        name,
        startDateTime: row.startDateTime?.trim() || null,
        endDateTime: row.endDateTime?.trim() || null,
      },
    ]
  })
}

type ArchiveRichnessFields = Pick<
  EventArchiveRecord,
  'attractions' | 'info' | 'description' | 'pleaseNote' | 'genreLabels'
>

/** True when the archive has lineup or detail fields beyond the basic schedule row. */
export function hasRichArchiveData(archive: ArchiveRichnessFields): boolean {
  const attractions = (archive.attractions ?? []).flatMap((row) => {
    const id = row.id?.trim()
    const name = row.name?.trim()
    return id && name ? [{id, name}] : []
  })

  return Boolean(
    attractions.length ||
      archive.info?.trim() ||
      archive.description?.trim() ||
      archive.pleaseNote?.trim() ||
      (archive.genreLabels?.length ?? 0) > 0,
  )
}

/** Map a Sanity archive row to the same shape live event pages use. */
export function eventDetailFromArchive(archive: EventArchiveRecord): EventDetail {
  const attractions = archivedAttractions(archive)

  return {
    id: archive.eventId,
    slug: archive.slug,
    name: archive.name,
    url: archive.ticketmasterUrl ?? '',
    imageUrl: archive.imageUrl,
    imageWidth: archive.imageWidth ?? null,
    imageHeight: archive.imageHeight ?? null,
    startDateTime: archive.startDateTime,
    localDate: archive.localDate,
    localTime: archive.localTime,
    timezone: archive.timezone ?? null,
    venueId: archive.venueId,
    venueName: archive.venueName,
    venueCity: archive.venueCity,
    venueState: archive.venueState,
    attractions,
    pleaseNote: archive.pleaseNote?.trim() || null,
    info: archive.info?.trim() || null,
    description: archive.description?.trim() || null,
    priceSummary: archive.priceSummary?.trim() || null,
    statusLabel: archive.statusLabel?.trim() || null,
    genreLabels: archive.genreLabels?.map((label) => label.trim()).filter(Boolean) ?? [],
    eventTypeLabel: archive.eventTypeLabel?.trim() || null,
    promoterNames: archive.promoterNames?.map((name) => name.trim()).filter(Boolean) ?? [],
    accessibilityInfo: archive.accessibilityInfo?.trim() || null,
    ticketLimitInfo: archive.ticketLimitInfo?.trim() || null,
    seatmapUrl: null,
    venueAddress: archive.venueAddress?.trim() || null,
    venueUrl: archive.venueUrl?.trim() || null,
    salesPublicStart: archive.salesPublicStart?.trim() || null,
    salesPublicEnd: archive.salesPublicEnd?.trim() || null,
    presales: archivedPresales(archive),
  }
}

/** Prefer archive snapshot; fall back to archive basics when detail fields are missing. */
export function mergeEventDetailWithArchive(
  detail: EventDetail,
  archive: EventArchiveRecord,
): EventDetail {
  const fromArchive = eventDetailFromArchive(archive)

  return {
    ...fromArchive,
    ...detail,
    slug: archive.slug,
    url: detail.url || fromArchive.url,
    imageUrl: detail.imageUrl ?? fromArchive.imageUrl,
    imageWidth: detail.imageWidth ?? fromArchive.imageWidth,
    imageHeight: detail.imageHeight ?? fromArchive.imageHeight,
    attractions: detail.attractions.length ? detail.attractions : fromArchive.attractions,
    pleaseNote: detail.pleaseNote ?? fromArchive.pleaseNote,
    info: detail.info ?? fromArchive.info,
    description: detail.description ?? fromArchive.description,
    priceSummary: detail.priceSummary ?? fromArchive.priceSummary,
    statusLabel: detail.statusLabel ?? fromArchive.statusLabel,
    genreLabels: detail.genreLabels.length ? detail.genreLabels : fromArchive.genreLabels,
    eventTypeLabel: detail.eventTypeLabel ?? fromArchive.eventTypeLabel,
    promoterNames: detail.promoterNames.length ? detail.promoterNames : fromArchive.promoterNames,
    accessibilityInfo: detail.accessibilityInfo ?? fromArchive.accessibilityInfo,
    ticketLimitInfo: detail.ticketLimitInfo ?? fromArchive.ticketLimitInfo,
    venueAddress: detail.venueAddress ?? fromArchive.venueAddress,
    venueUrl: detail.venueUrl ?? fromArchive.venueUrl,
    salesPublicStart: detail.salesPublicStart ?? fromArchive.salesPublicStart,
    salesPublicEnd: detail.salesPublicEnd ?? fromArchive.salesPublicEnd,
    presales: detail.presales.length ? detail.presales : fromArchive.presales,
  }
}
