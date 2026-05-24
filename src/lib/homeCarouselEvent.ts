import type {HomeCarouselSlide} from '@/lib/homeFeatured'
import {applyHomeCarouselSlideOrder, type HomeFeaturedHero} from '@/lib/homeFeatured'
import {buildHomeCarouselSlides} from '@/lib/homeCarousel'
import {getEventIndex, type ScheduleEvent} from '@/lib/ticketmaster'

/** UTC calendar day seed so the same event and slot persist for ~24h (works with ISR). */
export function homeCarouselDailySeed(date = new Date()): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  return y * 10_000 + m * 100 + d
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** Deterministic index in `[0, length)` from a daily seed and salt. */
export function pickDailyIndex(length: number, seed: number, salt: number): number {
  if (length <= 0) return 0
  const rng = mulberry32(seed + salt)
  return Math.floor(rng() * length)
}

export function pickDailyCarouselEvent(
  events: ScheduleEvent[],
  seed: number,
): ScheduleEvent | null {
  const withImage = events.filter((event) => event.imageUrl)
  if (!withImage.length) return null
  return withImage[pickDailyIndex(withImage.length, seed, 1)] ?? null
}

/** Accepts a bare slug or a path like /events/my-show-slug. */
export function normalizeCarouselEventSlug(input: string | null | undefined): string | null {
  const raw = input?.trim()
  if (!raw) return null

  const pathMatch = raw.match(/\/events\/([^/?#]+)/i)
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim()

  return raw.replace(/^\/+|\/+$/g, '') || null
}

export function resolvePinnedCarouselEvent(
  index: Awaited<ReturnType<typeof getEventIndex>>,
  slugInput: string | null | undefined,
): ScheduleEvent | null {
  if (index.error) return null

  const slug = normalizeCarouselEventSlug(slugInput)
  if (!slug) return null

  const event = index.bySlug.get(slug)
  if (!event?.imageUrl) return null

  return event
}

export function insertEventSlideAtDailyPosition(
  editorialSlides: HomeCarouselSlide[],
  event: ScheduleEvent,
  seed: number,
): HomeCarouselSlide[] {
  const eventSlide: HomeCarouselSlide = {kind: 'event', item: event}
  const insertAt = pickDailyIndex(editorialSlides.length + 1, seed, 2)
  const slides = [...editorialSlides]
  slides.splice(insertAt, 0, eventSlide)
  return slides
}

export async function buildHomeCarouselSlidesWithEvent(
  featured: HomeFeaturedHero[],
  recent: HomeFeaturedHero[],
  options?: {
    pinnedEventSlug?: string | null
    slideOrder?: string[] | null
  },
): Promise<{
  editorialSlides: HomeFeaturedHero[]
  slides: HomeCarouselSlide[]
  eventIncluded: boolean
  eventPinned: boolean
}> {
  const editorialRows = buildHomeCarouselSlides(featured, recent)
  const editorialSlides: HomeCarouselSlide[] = editorialRows.map((item) => ({
    kind: 'editorial',
    item,
  }))

  const seed = homeCarouselDailySeed()
  const slideOrder = options?.slideOrder?.filter(Boolean)
  const index = await getEventIndex()
  if (index.error) {
    return {
      editorialSlides: editorialRows,
      slides: applyHomeCarouselSlideOrder(editorialSlides, slideOrder),
      eventIncluded: false,
      eventPinned: false,
    }
  }

  const pinned = resolvePinnedCarouselEvent(index, options?.pinnedEventSlug)
  const event = pinned ?? pickDailyCarouselEvent(index.events, seed)
  if (!event) {
    return {
      editorialSlides: editorialRows,
      slides: applyHomeCarouselSlideOrder(editorialSlides, slideOrder),
      eventIncluded: false,
      eventPinned: false,
    }
  }

  const eventSlide: HomeCarouselSlide = {kind: 'event', item: event}
  const slides = slideOrder?.length
    ? applyHomeCarouselSlideOrder([...editorialSlides, eventSlide], slideOrder)
    : insertEventSlideAtDailyPosition(editorialSlides, event, seed)
  return {
    editorialSlides: editorialRows,
    slides,
    eventIncluded: true,
    eventPinned: Boolean(pinned),
  }
}
