import {
  SCHEDULE_DAYS_AHEAD,
  SCHEDULE_DMA_ID_DEFAULT,
  SCHEDULE_PAGE_SIZE,
  SCHEDULE_REVALIDATE_SECONDS,
} from '@/lib/schedule'

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
    venues?: Array<{
      name?: string
      city?: {name?: string}
      state?: {stateCode?: string}
    }>
  }
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
  const apikey = getApiKey()
  if (!apikey) {
    return {events: [], hasMore: false, error: 'not_configured'}
  }

  const {startDateTime, endDateTime} = scheduleDateWindow()
  const params = new URLSearchParams({
    apikey,
    classificationName: 'music',
    dmaId: getDmaId(),
    countryCode: 'US',
    locale: 'en-us',
    sort: 'date,asc',
    size: String(SCHEDULE_PAGE_SIZE),
    page: String(Math.max(0, page)),
    startDateTime,
    endDateTime,
  })

  let response: Response
  try {
    response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      {next: {revalidate: SCHEDULE_REVALIDATE_SECONDS}},
    )
  } catch {
    return {events: [], hasMore: false, error: 'api_error'}
  }

  if (!response.ok) {
    return {events: [], hasMore: false, error: 'api_error'}
  }

  let json: TicketmasterEventsResponse
  try {
    json = (await response.json()) as TicketmasterEventsResponse
  } catch {
    return {events: [], hasMore: false, error: 'api_error'}
  }

  const rawEvents = json._embedded?.events ?? []
  const events = rawEvents
    .map(normalizeEvent)
    .filter((event): event is ScheduleEvent => event != null)

  const pageNumber = json.page?.number ?? page
  const totalPages = json.page?.totalPages ?? 0
  const hasMore = totalPages > 0 ? pageNumber < totalPages - 1 : events.length === SCHEDULE_PAGE_SIZE

  return {events, hasMore}
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
