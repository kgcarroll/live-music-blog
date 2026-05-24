import {unstable_cache} from 'next/cache'
import {cache} from 'react'
import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_DMA_ID_DEFAULT,
  SCHEDULE_PAGE_SIZE,
  SCHEDULE_REVALIDATE_SECONDS,
} from '@/lib/schedule'
import {assignUniqueEventSlugs, eventSlugFromEvent} from '@/lib/eventSlug'
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
}

export type EventDetail = ScheduleEvent & {
  pleaseNote: string | null
  info: string | null
  priceSummary: string | null
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
  _embedded?: {
    venues?: TicketmasterVenueEmbedded[]
  }
}

type TicketmasterVenueEmbedded = {
  id?: string
  name?: string
  url?: string
  city?: {name?: string}
  state?: {stateCode?: string}
  postalCode?: string
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
  /** Often from an upcoming event at this venue; venue detail may have its own images. */
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  /** Earliest upcoming show at this venue in the current date window. */
  nextShowName: string | null
  nextShowWhen: string | null
  nextShowUrl: string | null
  nextShowSlug: string | null
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
): Promise<{events: TicketmasterEvent[]; totalPages: number; error?: 'not_configured' | 'api_error'}> {
  const apikey = getApiKey()
  if (!apikey) {
    return {events: [], totalPages: 0, error: 'not_configured'}
  }

  const params = buildMusicEventsParams(page, size, venueId)

  let response: Response
  try {
    response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      {next: {revalidate: SCHEDULE_REVALIDATE_SECONDS}},
    )
  } catch {
    return {events: [], totalPages: 0, error: 'api_error'}
  }

  if (!response.ok) {
    return {events: [], totalPages: 0, error: 'api_error'}
  }

  let json: TicketmasterEventsResponse
  try {
    json = (await response.json()) as TicketmasterEventsResponse
  } catch {
    return {events: [], totalPages: 0, error: 'api_error'}
  }

  return {
    events: json._embedded?.events ?? [],
    totalPages: json.page?.totalPages ?? 0,
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

function nextShowFieldsFromEvent(event: ScheduleEvent | undefined): Pick<
  VenueMapPin,
  'nextShowName' | 'nextShowWhen' | 'nextShowUrl' | 'nextShowSlug'
> {
  if (!event) {
    return {nextShowName: null, nextShowWhen: null, nextShowUrl: null, nextShowSlug: null}
  }
  const when = formatScheduleEventWhen(event)
  return {
    nextShowName: event.name,
    nextShowWhen: when.label,
    nextShowUrl: event.url,
    nextShowSlug: event.slug,
  }
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

function eventDetailFromRaw(raw: TicketmasterEvent): EventDetail | null {
  const core = normalizeEventCore(raw)
  if (!core) return null
  return {
    ...core,
    slug: eventSlugFromEvent(core),
    pleaseNote: raw.pleaseNote?.trim() || null,
    info: raw.info?.trim() || null,
    priceSummary: formatPriceSummary(raw.priceRanges),
  }
}

type TicketmasterFeed = {
  events: ScheduleEvent[]
  venues: VenueMapPin[]
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
async function loadTicketmasterFeedFromApi(): Promise<TicketmasterFeed> {
  if (!getApiKey()) {
    return {events: [], venues: [], error: 'not_configured'}
  }

  const rawEvents: TicketmasterEvent[] = []

  for (let page = 0; page < VENUES_MAX_EVENT_PAGES; page++) {
    const {events, totalPages, error} = await fetchMusicEventsJson(page, VENUES_EVENT_FETCH_SIZE)
    if (error) {
      return {events: [], venues: [], error}
    }

    rawEvents.push(...events)

    if (totalPages <= 0 || page >= totalPages - 1) break
  }

  const events = buildScheduleEventsFromRaw(rawEvents)
  const eventsById = new Map(events.map((event) => [event.id, event]))
  const venues = buildVenuesFromRawEvents(rawEvents, eventsById)

  return {events, venues}
}

const getTicketmasterFeedCached = unstable_cache(
  loadTicketmasterFeedFromApi,
  ['ticketmaster-feed', getDmaId()],
  {revalidate: SCHEDULE_REVALIDATE_SECONDS, tags: ['ticketmaster-feed']},
)

/** Cross-request cache (ISR window) + per-request dedupe via React cache below. */
const getTicketmasterFeed = cache(getTicketmasterFeedCached)

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
      {next: {revalidate: SCHEDULE_REVALIDATE_SECONDS}},
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
      {next: {revalidate: SCHEDULE_REVALIDATE_SECONDS}},
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

export function formatScheduleEventWhen(event: ScheduleEvent): {
  label: string
  dateTime?: string
} {
  if (event.startDateTime) {
    const date = new Date(event.startDateTime)
    if (!Number.isNaN(date.getTime())) {
      return {
        label: date.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        dateTime: event.startDateTime,
      }
    }
  }

  if (event.localDate) {
    const time =
      event.localTime && !event.localTime.startsWith('00:00')
        ? ` · ${event.localTime}`
        : ''
    return {label: `${event.localDate}${time}`, dateTime: event.localDate}
  }

  return {label: 'Date TBA'}
}

export function formatScheduleVenue(event: ScheduleEvent): string | null {
  const parts = [event.venueName, event.venueCity, event.venueState].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
