import {unstable_cache} from 'next/cache'
import {cache} from 'react'
import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_DMA_ID_DEFAULT,
  SCHEDULE_PAGE_SIZE,
  SCHEDULE_REVALIDATE_SECONDS,
} from '@/lib/schedule'
import {assignUniqueEventSlugs, eventSlugFromEvent} from '@/lib/eventSlug'
import type {EventSpotifyCurationInput} from '@/lib/spotifyArtistCuration'
import {syncEventArchivesOnFeedUpdate} from '@/lib/eventArchiveSync'
import type {TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'
import {formatSpotifyRateLimitMessage} from '@/lib/spotifyApi'
import {syncSpotifyArtistMatchesOnFeed} from '@/lib/spotifyAttractionSync'
import {persistTicketmasterFeedStatus} from '@/lib/ticketmasterFeedStatus'
import {applyCachedVenueImages} from '@/lib/venueImage'
import {syncVenueImagesOnFeed} from '@/lib/venueImageSync'
import {assignUniqueVenueSlugs} from '@/lib/venueSlug'
import {
  isVenueWithinMapRegion,
  VENUES_EVENT_FETCH_SIZE,
  VENUES_MAX_EVENT_PAGES,
} from '@/lib/venues'

export type ScheduleEvent = {
  id: string
  slug: string
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
  attractions: TicketmasterAttractionRef[]
}

export type EventPresale = {
  name: string
  startDateTime: string | null
  endDateTime: string | null
}

export type EventDetail = ScheduleEvent & {
  pleaseNote: string | null
  info: string | null
  priceSummary: string | null
  description: string | null
  statusLabel: string | null
  genreLabels: string[]
  eventTypeLabel: string | null
  promoterNames: string[]
  accessibilityInfo: string | null
  ticketLimitInfo: string | null
  seatmapUrl: string | null
  venueAddress: string | null
  venueUrl: string | null
  salesPublicStart: string | null
  salesPublicEnd: string | null
  presales: EventPresale[]
}

export type ScheduleEventsPageResult = {
  events: ScheduleEvent[]
  hasMore: boolean
  error?: 'not_configured' | 'api_error'
}

type TicketmasterImage = {
  url?: string
  ratio?: string
  width?: number
  height?: number
  fallback?: boolean
}

/** Prefer landscape ratios that fit schedule cards; pick widest asset per ratio. */
const SCHEDULE_IMAGE_RATIOS = ['16_9', '4_3', '3_2'] as const

type TicketmasterEvent = {
  id?: string
  name?: string
  url?: string
  info?: string
  description?: string
  pleaseNote?: string
  priceRanges?: {type?: string; currency?: string; min?: number; max?: number}[]
  images?: TicketmasterImage[]
  dates?: {
    start?: {
      dateTime?: string
      localDate?: string
      localTime?: string
      dateTBD?: boolean
      timeTBA?: boolean
    }
    timezone?: string
    status?: {code?: string}
  }
  sales?: {
    public?: {
      startDateTime?: string
      endDateTime?: string
      startTBD?: boolean
      startTBA?: boolean
    }
    presales?: {
      name?: string
      startDateTime?: string
      endDateTime?: string
    }[]
  }
  classifications?: {
    primary?: boolean
    segment?: {name?: string}
    genre?: {name?: string}
    subGenre?: {name?: string}
    subType?: {name?: string}
  }[]
  promoter?: {name?: string}
  promoters?: {name?: string}[]
  accessibility?: {info?: string; ticketLimit?: number}
  ticketLimit?: {info?: string}
  seatmap?: {staticUrl?: string}
  _embedded?: {
    venues?: TicketmasterVenueEmbedded[]
    attractions?: TicketmasterAttractionEmbedded[]
  }
}

type TicketmasterAttractionEmbedded = {
  id?: string
  name?: string
  url?: string
}

type TicketmasterVenueEmbedded = {
  id?: string
  name?: string
  url?: string
  city?: {name?: string}
  state?: {stateCode?: string}
  postalCode?: string
  address?: {line1?: string; line2?: string}
  location?: {longitude?: string; latitude?: string}
}

type TicketmasterVenueDetail = TicketmasterVenueEmbedded & {
  address?: {line1?: string; line2?: string}
  timezone?: string
  boxOfficeInfo?: {openHoursDetail?: string; acceptedPayment?: string; willCallDetail?: string}
  parkingDetail?: string
  accessibleSeatingDetail?: string
  images?: TicketmasterImage[]
}

type TicketmasterVenueResponse = {
  id?: string
  name?: string
  url?: string
} & TicketmasterVenueDetail

export type VenueMapPin = {
  id: string
  slug: string
  name: string
  latitude: number
  longitude: number
  city: string | null
  state: string | null
  upcomingEventCount: number
  /** Often from an upcoming event at this venue; overridden when a cached venue image exists. */
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  imageSource?: 'google_places' | 'ticketmaster'
  imageAttribution?: string
  /** Earliest upcoming show at this venue in the current date window. */
  nextShowName: string | null
  nextShowWhen: string | null
  nextShowUrl: string | null
  nextShowSlug: string | null
  /** ISO timestamp for the earliest upcoming show (for map filters). */
  nextShowAt: string | null
}

export type VenuesMapResult = {
  venues: VenueMapPin[]
  error?: 'not_configured' | 'api_error'
}

export type VenueDetail = {
  id: string
  name: string
  url: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  parkingDetail: string | null
  accessibleSeatingDetail: string | null
  boxOfficeHours: string | null
  imageUrl: string | null
}

export type VenueEventsResult = {
  events: ScheduleEvent[]
  hasMore: boolean
  error?: 'not_configured' | 'api_error'
}

type TicketmasterEventResponse = TicketmasterEvent

type ScheduleEventCore = Omit<ScheduleEvent, 'slug'>

type TicketmasterEventsResponse = {
  _embedded?: {events?: TicketmasterEvent[]}
  page?: {size?: number; totalElements?: number; totalPages?: number; number?: number}
}

function getApiKey(): string | null {
  const key = process.env.TICKETMASTER_API_KEY?.trim()
  return key || null
}

/** Busts the feed cache when TICKETMASTER_API_KEY changes (no secret stored). */
function getTicketmasterApiKeyFingerprint(): string {
  const key = getApiKey()
  if (!key) return 'none'
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Feed is cached at a higher level; avoid caching 429/error responses per URL. */
const ticketmasterFetchInit = {cache: 'no-store' as const}

function getDmaId(): string {
  return process.env.TICKETMASTER_DMA_ID?.trim() || SCHEDULE_DMA_ID_DEFAULT
}

function scheduleDateWindow(): {startDateTime: string; endDateTime: string} {
  const start = new Date()
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + SCHEDULE_DAYS_AHEAD)
  const toParam = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return {startDateTime: toParam(start), endDateTime: toParam(end)}
}

function normalizeImageUrl(url: string): string {
  return url.replace(/^http:\/\//i, 'https://')
}

function largestWithRatio(
  candidates: TicketmasterImage[],
  ratio: (typeof SCHEDULE_IMAGE_RATIOS)[number],
): TicketmasterImage | null {
  const matching = candidates.filter((img) => img.ratio === ratio)
  if (!matching.length) return null
  return matching.reduce((best, img) => ((img.width ?? 0) > (best.width ?? 0) ? img : best))
}

function pickEventImage(
  images: TicketmasterImage[] | undefined,
): {url: string; width: number | null; height: number | null} | null {
  if (!images?.length) return null
  const withUrl = images.filter((img) => typeof img.url === 'string' && img.url.length > 0)
  if (!withUrl.length) return null

  const nonFallback = withUrl.filter((img) => img.fallback !== true)
  const pool = nonFallback.length ? nonFallback : withUrl

  for (const ratio of SCHEDULE_IMAGE_RATIOS) {
    const best = largestWithRatio(pool, ratio)
    if (best?.url) {
      return {
        url: normalizeImageUrl(best.url),
        width: best.width ?? null,
        height: best.height ?? null,
      }
    }
  }

  const bestOverall = pool.reduce((best, img) =>
    (img.width ?? 0) > (best.width ?? 0) ? img : best,
  )
  if (!bestOverall.url) return null
  return {
    url: normalizeImageUrl(bestOverall.url),
    width: bestOverall.width ?? null,
    height: bestOverall.height ?? null,
  }
}

function parseCoordinate(value: string | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function venueFromEmbedded(raw: TicketmasterVenueEmbedded): VenueMapPin | null {
  const id = raw.id?.trim()
  const name = raw.name?.trim()
  const latitude = parseCoordinate(raw.location?.latitude)
  const longitude = parseCoordinate(raw.location?.longitude)
  if (!id || !name || latitude == null || longitude == null) return null

  const pin: VenueMapPin = {
    id,
    slug: '',
    name,
    latitude,
    longitude,
    city: raw.city?.name?.trim() || null,
    state: raw.state?.stateCode?.trim() || null,
    upcomingEventCount: 0,
    imageUrl: null,
    imageWidth: null,
    imageHeight: null,
    nextShowName: null,
    nextShowWhen: null,
    nextShowUrl: null,
    nextShowSlug: null,
    nextShowAt: null,
  }

  if (!isVenueWithinMapRegion(pin)) return null

  return pin
}

function buildMusicEventsParams(page: number, size: number, venueId?: string) {
  const {startDateTime, endDateTime} = scheduleDateWindow()
  const params = new URLSearchParams({
    apikey: getApiKey()!,
    classificationName: 'music',
    countryCode: 'US',
    locale: 'en-us',
    sort: 'date,asc',
    size: String(size),
    page: String(Math.max(0, page)),
    startDateTime,
    endDateTime,
  })
  if (venueId) {
    params.set('venueId', venueId)
  } else {
    params.set('dmaId', getDmaId())
  }
  return params
}

async function fetchMusicEventsJson(
  page: number,
  size: number,
  venueId?: string,
): Promise<{
  events: TicketmasterEvent[]
  totalPages: number
  error?: 'not_configured' | 'api_error' | 'rate_limit'
  httpStatus?: number
}> {
  const apikey = getApiKey()
  if (!apikey) {
    return {events: [], totalPages: 0, error: 'not_configured'}
  }

  const params = buildMusicEventsParams(page, size, venueId)

  let response: Response
  try {
    response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      ticketmasterFetchInit,
    )
  } catch {
    return {events: [], totalPages: 0, error: 'api_error'}
  }

  if (!response.ok) {
    const httpStatus = response.status
    const error = httpStatus === 429 ? 'rate_limit' : 'api_error'
    return {events: [], totalPages: 0, error, httpStatus}
  }

  let json: TicketmasterEventsResponse
  try {
    json = (await response.json()) as TicketmasterEventsResponse
  } catch {
    return {events: [], totalPages: 0, error: 'api_error', httpStatus: response.status}
  }

  return {
    events: json._embedded?.events ?? [],
    totalPages: json.page?.totalPages ?? 0,
    httpStatus: response.status,
  }
}

function eventSortKey(event: ScheduleEvent): number {
  if (event.startDateTime) {
    const time = Date.parse(event.startDateTime)
    if (!Number.isNaN(time)) return time
  }
  if (event.localDate) {
    const time = Date.parse(`${event.localDate}T${event.localTime ?? '00:00:00'}`)
    if (!Number.isNaN(time)) return time
  }
  return Number.MAX_SAFE_INTEGER
}

function considerEarlierNextShow(
  byVenueId: Map<string, ScheduleEventCore>,
  event: ScheduleEventCore,
  venueId: string,
) {
  const current = byVenueId.get(venueId)
  const a = {...event, slug: eventSlugFromEvent(event)}
  const b = current ? {...current, slug: eventSlugFromEvent(current)} : null
  if (!b || eventSortKey(a) < eventSortKey(b)) {
    byVenueId.set(venueId, event)
  }
}

function scheduleEventIsoTimestamp(
  event: Pick<ScheduleEvent, 'startDateTime' | 'localDate' | 'localTime'>,
): string | null {
  if (event.startDateTime) {
    const time = Date.parse(event.startDateTime)
    if (!Number.isNaN(time)) return new Date(time).toISOString()
  }
  if (event.localDate) {
    const time = Date.parse(`${event.localDate}T${event.localTime ?? '00:00:00'}`)
    if (!Number.isNaN(time)) return new Date(time).toISOString()
  }
  return null
}

function nextShowFieldsFromEvent(event: ScheduleEvent | undefined): Pick<
  VenueMapPin,
  'nextShowName' | 'nextShowWhen' | 'nextShowUrl' | 'nextShowSlug' | 'nextShowAt'
> {
  if (!event) {
    return {
      nextShowName: null,
      nextShowWhen: null,
      nextShowUrl: null,
      nextShowSlug: null,
      nextShowAt: null,
    }
  }
  const when = formatScheduleEventWhen(event)
  return {
    nextShowName: event.name,
    nextShowWhen: when.label,
    nextShowUrl: event.url,
    nextShowSlug: event.slug,
    nextShowAt: scheduleEventIsoTimestamp(event),
  }
}

function parseAttractionsFromRaw(raw: TicketmasterEvent): TicketmasterAttractionRef[] {
  const items = raw._embedded?.attractions ?? []
  const out: TicketmasterAttractionRef[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const id = item.id?.trim()
    const name = item.name?.trim()
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    out.push({id, name, url: item.url?.trim() || null})
  }

  return out
}

function collectAttractionsFromRawEvents(rawEvents: TicketmasterEvent[]): TicketmasterAttractionRef[] {
  const byId = new Map<string, TicketmasterAttractionRef>()
  for (const raw of rawEvents) {
    for (const attraction of parseAttractionsFromRaw(raw)) {
      if (!byId.has(attraction.id)) {
        byId.set(attraction.id, attraction)
      }
    }
  }
  return [...byId.values()]
}

/** Events with lineup context for OpenAI Spotify curation. */
export function buildEventSpotifyCurationInputs(
  rawEvents: TicketmasterEvent[],
): EventSpotifyCurationInput[] {
  const results: EventSpotifyCurationInput[] = []
  const seen = new Set<string>()

  for (const raw of rawEvents) {
    const eventId = raw.id?.trim()
    if (!eventId || seen.has(eventId)) continue
    seen.add(eventId)

    const attractions = parseAttractionsFromRaw(raw)
    if (!attractions.length) continue

    const detail = eventDetailFromRaw(raw)
    if (!detail) continue

    results.push({
      eventId,
      eventName: detail.name,
      venueName: detail.venueName,
      genreLabels: detail.genreLabels,
      eventTypeLabel: detail.eventTypeLabel,
      info: detail.info,
      attractions,
    })
  }

  return results
}

function normalizeEventCore(raw: TicketmasterEvent): ScheduleEventCore | null {
  const id = raw.id?.trim()
  const name = raw.name?.trim()
  const url = raw.url?.trim()
  if (!id || !name || !url) return null

  const start = raw.dates?.start
  const venue = raw._embedded?.venues?.[0]

  const image = pickEventImage(raw.images)

  return {
    id,
    name,
    url,
    imageUrl: image?.url ?? null,
    imageWidth: image?.width ?? null,
    imageHeight: image?.height ?? null,
    startDateTime: start?.dateTime ?? null,
    localDate: start?.localDate ?? null,
    localTime: start?.localTime ?? null,
    timezone: raw.dates?.timezone ?? null,
    venueId: venue?.id?.trim() || null,
    venueName: venue?.name?.trim() || null,
    venueCity: venue?.city?.name?.trim() || null,
    venueState: venue?.state?.stateCode?.trim() || null,
    attractions: parseAttractionsFromRaw(raw),
  }
}

function formatPriceSummary(
  ranges: TicketmasterEvent['priceRanges'] | undefined,
): string | null {
  if (!ranges?.length) return null
  const standard = ranges.find((r) => r.type === 'standard') ?? ranges[0]
  const min = standard?.min
  const max = standard?.max
  const currency = standard?.currency ?? 'USD'
  if (min == null && max == null) return null
  const symbol = currency === 'USD' ? '$' : `${currency} `
  if (min != null && max != null && min !== max) {
    return `${symbol}${min}–${symbol}${max}`
  }
  const value = min ?? max
  return value != null ? `${symbol}${value}` : null
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  onsale: 'On sale',
  offsale: 'Off sale',
  canceled: 'Canceled',
  cancelled: 'Canceled',
  postponed: 'Postponed',
  rescheduled: 'Rescheduled',
}

function formatEventStatusLabel(code: string | undefined): string | null {
  const key = code?.trim().toLowerCase()
  if (!key) return null
  return EVENT_STATUS_LABELS[key] ?? code!.trim()
}

function isMeaningfulClassificationLabel(value: string | undefined): value is string {
  const label = value?.trim()
  return Boolean(label && label.toLowerCase() !== 'undefined')
}

function parseEventClassifications(raw: TicketmasterEvent): {
  genreLabels: string[]
  eventTypeLabel: string | null
} {
  const primary = raw.classifications?.find((row) => row.primary) ?? raw.classifications?.[0]
  if (!primary) return {genreLabels: [], eventTypeLabel: null}

  const genreLabels = [
    primary.genre?.name,
    primary.subGenre?.name,
    primary.segment?.name,
  ].filter(isMeaningfulClassificationLabel)

  const eventTypeLabel = isMeaningfulClassificationLabel(primary.subType?.name)
    ? primary.subType!.name!.trim()
    : null

  return {genreLabels: [...new Set(genreLabels)], eventTypeLabel}
}

function parsePromoterNames(raw: TicketmasterEvent): string[] {
  const names = [
    ...(raw.promoters?.map((row) => row.name?.trim()).filter(Boolean) ?? []),
    raw.promoter?.name?.trim(),
  ].filter(Boolean) as string[]
  return [...new Set(names)]
}

function parseEventPresales(raw: TicketmasterEvent): EventPresale[] {
  return (raw.sales?.presales ?? [])
    .map((row) => ({
      name: row.name?.trim() || 'Presale',
      startDateTime: row.startDateTime?.trim() || null,
      endDateTime: row.endDateTime?.trim() || null,
    }))
    .filter((row) => row.name)
}

function venueAddressFromEmbedded(venue: TicketmasterVenueEmbedded | undefined): string | null {
  if (!venue) return null
  const parts = [
    venue.address?.line1?.trim(),
    venue.address?.line2?.trim(),
    [venue.city?.name?.trim(), venue.state?.stateCode?.trim()].filter(Boolean).join(', '),
    venue.postalCode?.trim(),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export function formatTicketmasterDateTime(
  iso: string | null | undefined,
  timezone?: string | null,
): string | null {
  if (!iso?.trim()) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone?.trim() || undefined,
  })
}

function eventDetailFromRaw(raw: TicketmasterEvent): EventDetail | null {
  const core = normalizeEventCore(raw)
  if (!core) return null

  const venue = raw._embedded?.venues?.[0]
  const {genreLabels, eventTypeLabel} = parseEventClassifications(raw)
  const info = raw.info?.trim() || null
  const description = raw.description?.trim() || null

  return {
    ...core,
    slug: eventSlugFromEvent(core),
    pleaseNote: raw.pleaseNote?.trim() || null,
    info,
    description: description && description !== info ? description : null,
    priceSummary: formatPriceSummary(raw.priceRanges),
    statusLabel: formatEventStatusLabel(raw.dates?.status?.code),
    genreLabels,
    eventTypeLabel,
    promoterNames: parsePromoterNames(raw),
    accessibilityInfo: raw.accessibility?.info?.trim() || null,
    ticketLimitInfo: raw.ticketLimit?.info?.trim() || null,
    seatmapUrl: raw.seatmap?.staticUrl?.trim() || null,
    venueAddress: venueAddressFromEmbedded(venue),
    venueUrl: venue?.url?.trim() || null,
    salesPublicStart: raw.sales?.public?.startDateTime?.trim() || null,
    salesPublicEnd: raw.sales?.public?.endDateTime?.trim() || null,
    presales: parseEventPresales(raw),
  }
}

type TicketmasterFeed = {
  events: ScheduleEvent[]
  venues: VenueMapPin[]
  curationInputs: EventSpotifyCurationInput[]
  error?: 'not_configured' | 'api_error'
}

function buildScheduleEventsFromRaw(rawEvents: TicketmasterEvent[]): ScheduleEvent[] {
  const byId = new Map<string, ScheduleEventCore>()

  for (const raw of rawEvents) {
    const event = normalizeEventCore(raw)
    if (!event || byId.has(event.id)) continue
    byId.set(event.id, event)
  }

  return assignUniqueEventSlugs(
    [...byId.values()].sort(
      (a, b) =>
        eventSortKey({...a, slug: eventSlugFromEvent(a)}) -
        eventSortKey({...b, slug: eventSlugFromEvent(b)}),
    ),
  )
}

function buildVenuesFromRawEvents(
  rawEvents: TicketmasterEvent[],
  eventsById: Map<string, ScheduleEvent>,
): VenueMapPin[] {
  const byId = new Map<string, VenueMapPin>()
  const nextEventByVenueId = new Map<string, ScheduleEventCore>()

  for (const raw of rawEvents) {
    const embedded = raw._embedded?.venues?.[0]
    if (!embedded) continue
    const pin = venueFromEmbedded(embedded)
    if (!pin) continue
    const event = normalizeEventCore(raw)
    if (!event) continue
    const eventImage = pickEventImage(raw.images)
    considerEarlierNextShow(nextEventByVenueId, event, pin.id)
    const existing = byId.get(pin.id)
    if (existing) {
      existing.upcomingEventCount += 1
      if (!existing.imageUrl && eventImage) {
        existing.imageUrl = eventImage.url
        existing.imageWidth = eventImage.width
        existing.imageHeight = eventImage.height
      }
    } else {
      byId.set(pin.id, {
        ...pin,
        upcomingEventCount: 1,
        imageUrl: eventImage?.url ?? null,
        imageWidth: eventImage?.width ?? null,
        imageHeight: eventImage?.height ?? null,
        ...nextShowFieldsFromEvent(undefined),
      })
    }
  }

  return assignUniqueVenueSlugs(
    [...byId.values()]
      .map((pin) => {
        const nextCore = nextEventByVenueId.get(pin.id)
        const nextEvent = nextCore ? eventsById.get(nextCore.id) : undefined
        return {
          ...pin,
          ...nextShowFieldsFromEvent(nextEvent),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  )
}

/** One paginated Discovery scan; builds both event and venue indexes. */
async function loadTicketmasterFeedFromApi(options?: {
  skipSpotifySync?: boolean
  skipVenueImageSync?: boolean
}): Promise<TicketmasterFeed> {
  const attemptAt = new Date().toISOString()
  const fingerprint = getTicketmasterApiKeyFingerprint()
  const dmaId = getDmaId()

  if (!getApiKey()) {
    await persistTicketmasterFeedStatus({
      lastAttemptAt: attemptAt,
      lastError: 'not_configured',
      apiKeyFingerprint: fingerprint,
      dmaId,
    })
    return {events: [], venues: [], curationInputs: [], error: 'not_configured'}
  }

  const rawEvents: TicketmasterEvent[] = []
  let pagesFetched = 0
  let lastHttpStatus: number | undefined

  for (let page = 0; page < VENUES_MAX_EVENT_PAGES; page++) {
    const {events, totalPages, error, httpStatus} = await fetchMusicEventsJson(page, VENUES_EVENT_FETCH_SIZE)
    pagesFetched += 1
    if (httpStatus != null) lastHttpStatus = httpStatus

    if (error) {
      await persistTicketmasterFeedStatus({
        lastAttemptAt: attemptAt,
        lastError: error,
        lastHttpStatus: httpStatus ?? null,
        pagesFetched,
        apiKeyFingerprint: fingerprint,
        dmaId,
      })
      return {events: [], venues: [], curationInputs: [], error: error === 'rate_limit' ? 'api_error' : error}
    }

    rawEvents.push(...events)

    if (totalPages <= 0 || page >= totalPages - 1) break
  }

  const events = buildScheduleEventsFromRaw(rawEvents)
  const eventsById = new Map(events.map((event) => [event.id, event]))
  let venues = buildVenuesFromRawEvents(rawEvents, eventsById)
  venues = await applyCachedVenueImages(venues)

  const detailsById = new Map<string, EventDetail>()
  for (const raw of rawEvents) {
    const detail = eventDetailFromRaw(raw)
    if (!detail) continue
    const indexed = eventsById.get(detail.id)
    if (!indexed) continue
    detailsById.set(detail.id, {...detail, slug: indexed.slug})
  }

  await persistTicketmasterFeedStatus({
    lastAttemptAt: attemptAt,
    lastSuccessAt: attemptAt,
    lastError: null,
    lastHttpStatus: lastHttpStatus ?? 200,
    eventCount: events.length,
    venueCount: venues.length,
    pagesFetched,
    apiKeyFingerprint: fingerprint,
    dmaId,
  })

  void syncEventArchivesOnFeedUpdate(events, venues, detailsById).catch((error) => {
    console.warn('[eventArchive] Failed to sync event archives:', error)
  })

  const curationInputs = buildEventSpotifyCurationInputs(rawEvents)
  if (!options?.skipSpotifySync) {
    void syncSpotifyArtistMatchesOnFeed(curationInputs)
      .then((result) => {
        if (result.rateLimited) {
          console.warn(formatSpotifyRateLimitMessage(result.retryAfterMs ?? 60_000))
        }
      })
      .catch((error) => {
        console.warn('[spotify] Failed to sync artist matches:', error)
      })
  }

  if (!options?.skipVenueImageSync) {
    try {
      await syncVenueImagesOnFeed(venues)
    } catch (error) {
      console.warn('[venueImage] Failed to sync venue images:', error)
    }
  }

  return {events, venues, curationInputs}
}

/** Bypass Next.js `unstable_cache` / React `cache` — use in CLI scripts only. */
export async function loadTicketmasterFeedDirect(options?: {
  skipSpotifySync?: boolean
  skipVenueImageSync?: boolean
}): Promise<TicketmasterFeed> {
  return loadTicketmasterFeedFromApi(options)
}

class TicketmasterFeedLoadError extends Error {
  constructor(readonly code: 'not_configured' | 'api_error') {
    super(code)
    this.name = 'TicketmasterFeedLoadError'
  }
}

const getTicketmasterFeedCached = unstable_cache(
  async (): Promise<TicketmasterFeed> => {
    const feed = await loadTicketmasterFeedFromApi()
    if (feed.error) {
      throw new TicketmasterFeedLoadError(feed.error)
    }
    return feed
  },
  ['ticketmaster-feed', getDmaId(), getTicketmasterApiKeyFingerprint()],
  {revalidate: SCHEDULE_REVALIDATE_SECONDS, tags: ['ticketmaster-feed']},
)

/** Cross-request cache (ISR window) + per-request dedupe via React cache below. */
const getTicketmasterFeed = cache(async (): Promise<TicketmasterFeed> => {
  try {
    return await getTicketmasterFeedCached()
  } catch (error) {
    if (error instanceof TicketmasterFeedLoadError) {
      return {events: [], venues: [], curationInputs: [], error: error.code}
    }
    return {events: [], venues: [], curationInputs: [], error: 'api_error'}
  }
})

function paginateScheduleEvents(events: ScheduleEvent[], page: number): ScheduleEventsPageResult {
  const start = Math.max(0, page) * SCHEDULE_PAGE_SIZE
  const slice = events.slice(start, start + SCHEDULE_PAGE_SIZE)
  return {
    events: slice,
    hasMore: start + slice.length < events.length,
  }
}

export async function fetchScheduleEventsPage(page: number): Promise<ScheduleEventsPageResult> {
  const feed = await getTicketmasterFeed()
  if (feed.error) {
    return {events: [], hasMore: false, error: feed.error}
  }
  return paginateScheduleEvents(feed.events, page)
}

export async function fetchScheduleEventsThroughPage(page: number): Promise<ScheduleEventsPageResult> {
  const feed = await getTicketmasterFeed()
  if (feed.error) {
    return {events: [], hasMore: false, error: feed.error}
  }
  const maxPage = Math.max(0, page)
  const end = (maxPage + 1) * SCHEDULE_PAGE_SIZE
  return {
    events: feed.events.slice(0, end),
    hasMore: end < feed.events.length,
  }
}

type EventIndex = {
  events: ScheduleEvent[]
  bySlug: Map<string, ScheduleEvent>
  byId: Map<string, ScheduleEvent>
  error?: 'not_configured' | 'api_error'
}

/** Cached per request so schedule, venues, and event pages share one Ticketmaster scan. */
export const getEventIndex = cache(async (): Promise<EventIndex> => {
  const feed = await getTicketmasterFeed()
  if (feed.error) {
    return {events: [], bySlug: new Map(), byId: new Map(), error: feed.error}
  }
  return {
    events: feed.events,
    bySlug: new Map(feed.events.map((event) => [event.slug, event])),
    byId: new Map(feed.events.map((event) => [event.id, event])),
  }
})

type VenueIndex = {
  venues: VenueMapPin[]
  bySlug: Map<string, VenueMapPin>
  byId: Map<string, VenueMapPin>
  error?: 'not_configured' | 'api_error'
}

/** Cached per request so hub + detail pages share one Ticketmaster scan. */
export const getVenueIndex = cache(async (): Promise<VenueIndex> => {
  const feed = await getTicketmasterFeed()
  if (feed.error) {
    return {venues: [], bySlug: new Map(), byId: new Map(), error: feed.error}
  }
  return {
    venues: feed.venues,
    bySlug: new Map(feed.venues.map((venue) => [venue.slug, venue])),
    byId: new Map(feed.venues.map((venue) => [venue.id, venue])),
  }
})

export async function fetchVenuesFromUpcomingMusic(): Promise<VenuesMapResult> {
  const index = await getVenueIndex()
  if (index.error) {
    return {venues: [], error: index.error}
  }
  return {venues: index.venues}
}

/** Resolve a venue pin by URL slug, or legacy Ticketmaster id in the path. */
export async function fetchVenueMapPinBySlug(
  slugOrId: string,
): Promise<
  | {pin: VenueMapPin; matchedBy: 'slug' | 'id'}
  | null
  | 'not_configured'
  | 'api_error'
> {
  const key = decodeURIComponent(slugOrId.trim())
  if (!key) return null

  const index = await getVenueIndex()
  if (index.error) return index.error

  const bySlug = index.bySlug.get(key)
  if (bySlug) return {pin: bySlug, matchedBy: 'slug'}

  const byId = index.byId.get(key)
  if (byId) return {pin: byId, matchedBy: 'id'}

  return null
}

export async function fetchVenueById(
  venueId: string,
): Promise<VenueDetail | null | 'not_configured' | 'api_error'> {
  const apikey = getApiKey()
  if (!apikey) return 'not_configured'

  const id = venueId.trim()
  if (!id) return null

  let response: Response
  try {
    response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/venues/${encodeURIComponent(id)}.json?apikey=${apikey}&locale=en-us`,
      ticketmasterFetchInit,
    )
  } catch {
    return 'api_error'
  }

  if (response.status === 404) return null
  if (!response.ok) return 'api_error'

  let json: TicketmasterVenueResponse
  try {
    json = (await response.json()) as TicketmasterVenueResponse
  } catch {
    return 'api_error'
  }

  const name = json.name?.trim()
  if (!name) return null

  const image = pickEventImage(json.images)

  return {
    id: json.id?.trim() || id,
    name,
    url: json.url?.trim() || null,
    addressLine1: json.address?.line1?.trim() || null,
    addressLine2: json.address?.line2?.trim() || null,
    city: json.city?.name?.trim() || null,
    state: json.state?.stateCode?.trim() || null,
    postalCode: json.postalCode?.trim() || null,
    latitude: parseCoordinate(json.location?.latitude),
    longitude: parseCoordinate(json.location?.longitude),
    timezone: json.timezone?.trim() || null,
    parkingDetail: json.parkingDetail?.trim() || null,
    accessibleSeatingDetail: json.accessibleSeatingDetail?.trim() || null,
    boxOfficeHours: json.boxOfficeInfo?.openHoursDetail?.trim() || null,
    imageUrl: image?.url ?? null,
  }
}

export async function fetchVenueEventsPage(
  venueId: string,
  page: number,
): Promise<VenueEventsResult> {
  const index = await getEventIndex()
  if (index.error) {
    return {events: [], hasMore: false, error: index.error}
  }

  const id = venueId.trim()
  const venueEvents = index.events.filter((event) => event.venueId === id)
  const result = paginateScheduleEvents(venueEvents, page)
  return {events: result.events, hasMore: result.hasMore}
}

export async function fetchVenueEventsThroughPage(
  venueId: string,
  page: number,
): Promise<VenueEventsResult> {
  const index = await getEventIndex()
  if (index.error) {
    return {events: [], hasMore: false, error: index.error}
  }

  const id = venueId.trim()
  const venueEvents = index.events.filter((event) => event.venueId === id)
  const maxPage = Math.max(0, page)
  const end = (maxPage + 1) * SCHEDULE_PAGE_SIZE
  return {
    events: venueEvents.slice(0, end),
    hasMore: end < venueEvents.length,
  }
}

export async function fetchEventMatchBySlug(
  slugOrId: string,
): Promise<
  | {event: ScheduleEvent; matchedBy: 'slug' | 'id'}
  | null
  | 'not_configured'
  | 'api_error'
> {
  const key = decodeURIComponent(slugOrId.trim())
  if (!key) return null

  const index = await getEventIndex()
  if (index.error) return index.error

  const bySlug = index.bySlug.get(key)
  if (bySlug) return {event: bySlug, matchedBy: 'slug'}

  const byId = index.byId.get(key)
  if (byId) return {event: byId, matchedBy: 'id'}

  return null
}

export async function fetchEventDetailById(
  eventId: string,
): Promise<EventDetail | null | 'not_configured' | 'api_error'> {
  const apikey = getApiKey()
  if (!apikey) return 'not_configured'

  const id = eventId.trim()
  if (!id) return null

  let response: Response
  try {
    response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(id)}.json?apikey=${apikey}&locale=en-us`,
      ticketmasterFetchInit,
    )
  } catch {
    return 'api_error'
  }

  if (response.status === 404) return null
  if (!response.ok) return 'api_error'

  let json: TicketmasterEventResponse
  try {
    json = (await response.json()) as TicketmasterEventResponse
  } catch {
    return 'api_error'
  }

  const detail = eventDetailFromRaw(json)
  if (!detail) return null

  const index = await getEventIndex()
  if (!index.error) {
    const indexed = index.byId.get(detail.id)
    if (indexed) {
      return {...detail, slug: indexed.slug}
    }
  }

  return detail
}

/** Upcoming shows related to this event (same venue first, then soonest others). */
export async function fetchRelatedEvents(
  event: ScheduleEvent,
  limit = 3,
): Promise<ScheduleEvent[]> {
  const index = await getEventIndex()
  if (index.error) return []

  const candidates = index.events.filter((candidate) => candidate.id !== event.id)
  const sameVenue = event.venueId
    ? candidates.filter((candidate) => candidate.venueId === event.venueId)
    : []
  const otherVenue = candidates.filter(
    (candidate) => !event.venueId || candidate.venueId !== event.venueId,
  )
  const byDate = (a: ScheduleEvent, b: ScheduleEvent) => eventSortKey(a) - eventSortKey(b)

  return [...sameVenue.sort(byDate), ...otherVenue.sort(byDate)].slice(0, limit)
}

export function formatVenueAddress(venue: VenueDetail): string | null {
  const parts = [
    venue.addressLine1,
    venue.addressLine2,
    [venue.city, venue.state].filter(Boolean).join(', '),
    venue.postalCode,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function formatLocalTimeSuffix(localTime: string | null | undefined): string {
  const raw = localTime?.trim()
  if (!raw || raw.startsWith('00:00')) return ''

  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ` · ${raw}`

  let hour = Number.parseInt(match[1]!, 10)
  const minute = match[2]!
  if (!Number.isFinite(hour)) return ` · ${raw}`

  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  const clock = minute === '00' ? `${hour} ${ampm}` : `${hour}:${minute} ${ampm}`
  return ` · ${clock}`
}

function formatLocalDateLabel(localDate: string): string {
  const match = localDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return localDate

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
  if (Number.isNaN(date.getTime())) return localDate

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatScheduleEventWhen(event: ScheduleEvent): {
  label: string
  dateTime?: string
} {
  const timezone = event.timezone?.trim() || null

  if (event.startDateTime && timezone) {
    const label = formatTicketmasterDateTime(event.startDateTime, timezone)
    if (label) {
      return {label, dateTime: event.startDateTime}
    }
  }

  if (event.localDate) {
    const label = `${formatLocalDateLabel(event.localDate)}${formatLocalTimeSuffix(event.localTime)}`
    return {label, dateTime: event.startDateTime ?? event.localDate}
  }

  if (event.startDateTime) {
    const label = formatTicketmasterDateTime(event.startDateTime, timezone)
    if (label) {
      return {label, dateTime: event.startDateTime}
    }
  }

  return {label: 'Date TBA'}
}

export function formatScheduleVenue(event: ScheduleEvent): string | null {
  const parts = [event.venueName, event.venueCity, event.venueState].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
