import {cache} from 'react'
import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_DMA_ID_DEFAULT,
  SCHEDULE_PAGE_SIZE,
  SCHEDULE_REVALIDATE_SECONDS,
} from '@/lib/schedule'
import {assignUniqueVenueSlugs} from '@/lib/venueSlug'
import {
  isVenueWithinMapRegion,
  VENUES_EVENT_FETCH_SIZE,
  VENUES_MAX_EVENT_PAGES,
} from '@/lib/venues'

export type ScheduleEvent = {
  id: string
  name: string
  url: string
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  startDateTime: string | null
  localDate: string | null
  localTime: string | null
  timezone: string | null
  venueName: string | null
  venueCity: string | null
  venueState: string | null
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
  byVenueId: Map<string, ScheduleEvent>,
  venueId: string,
  event: ScheduleEvent,
) {
  const current = byVenueId.get(venueId)
  if (!current || eventSortKey(event) < eventSortKey(current)) {
    byVenueId.set(venueId, event)
  }
}

function nextShowFieldsFromEvent(event: ScheduleEvent | undefined): Pick<
  VenueMapPin,
  'nextShowName' | 'nextShowWhen' | 'nextShowUrl'
> {
  if (!event) {
    return {nextShowName: null, nextShowWhen: null, nextShowUrl: null}
  }
  const when = formatScheduleEventWhen(event)
  return {
    nextShowName: event.name,
    nextShowWhen: when.label,
    nextShowUrl: event.url,
  }
}

function normalizeEvent(raw: TicketmasterEvent): ScheduleEvent | null {
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
    venueName: venue?.name?.trim() || null,
    venueCity: venue?.city?.name?.trim() || null,
    venueState: venue?.state?.stateCode?.trim() || null,
  }
}

export async function fetchScheduleEventsPage(page: number): Promise<ScheduleEventsPageResult> {
  const {events: rawEvents, totalPages, error} = await fetchMusicEventsJson(page, SCHEDULE_PAGE_SIZE)
  if (error) {
    return {events: [], hasMore: false, error}
  }

  const events = rawEvents
    .map(normalizeEvent)
    .filter((event): event is ScheduleEvent => event != null)

  const hasMore = totalPages > 0 ? page < totalPages - 1 : events.length === SCHEDULE_PAGE_SIZE

  return {events, hasMore}
}

type VenueIndex = {
  venues: VenueMapPin[]
  bySlug: Map<string, VenueMapPin>
  byId: Map<string, VenueMapPin>
  error?: 'not_configured' | 'api_error'
}

/** Cached per request so hub + detail pages share one Ticketmaster scan. */
export const getVenueIndex = cache(async (): Promise<VenueIndex> => {
  const result = await loadVenuesFromUpcomingMusic()
  if (result.error) {
    return {venues: [], bySlug: new Map(), byId: new Map(), error: result.error}
  }
  return {
    venues: result.venues,
    bySlug: new Map(result.venues.map((venue) => [venue.slug, venue])),
    byId: new Map(result.venues.map((venue) => [venue.id, venue])),
  }
})

/** Unique venues with lat/lng from upcoming music events in the DMA (option B). */
async function loadVenuesFromUpcomingMusic(): Promise<VenuesMapResult> {
  const byId = new Map<string, VenueMapPin>()
  const nextEventByVenueId = new Map<string, ScheduleEvent>()

  for (let page = 0; page < VENUES_MAX_EVENT_PAGES; page++) {
    const {events: rawEvents, totalPages, error} = await fetchMusicEventsJson(
      page,
      VENUES_EVENT_FETCH_SIZE,
    )
    if (error) {
      return {venues: [], error}
    }

    for (const raw of rawEvents) {
      const embedded = raw._embedded?.venues?.[0]
      if (!embedded) continue
      const pin = venueFromEmbedded(embedded)
      if (!pin) continue
      const event = normalizeEvent(raw)
      if (!event) continue
      const eventImage = pickEventImage(raw.images)
      considerEarlierNextShow(nextEventByVenueId, pin.id, event)
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

    if (totalPages <= 0 || page >= totalPages - 1) break
  }

  const venues = assignUniqueVenueSlugs(
    [...byId.values()]
      .map((pin) => ({
        ...pin,
        ...nextShowFieldsFromEvent(nextEventByVenueId.get(pin.id)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  )
  return {venues}
}

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
  const {events: rawEvents, totalPages, error} = await fetchMusicEventsJson(
    page,
    SCHEDULE_PAGE_SIZE,
    venueId,
  )
  if (error) {
    return {events: [], hasMore: false, error}
  }

  const events = rawEvents
    .map(normalizeEvent)
    .filter((event): event is ScheduleEvent => event != null)

  const hasMore = totalPages > 0 ? page < totalPages - 1 : events.length === SCHEDULE_PAGE_SIZE

  return {events, hasMore}
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
