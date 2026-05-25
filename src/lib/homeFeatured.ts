import type {EditorialCardItem} from '@/components/EditorialCard'
import type {ScheduleEvent} from '@/lib/ticketmaster'
import {editorialHref, eventHref} from '@/lib/paths'

/** Editorial types that support homepage featuring. */
export const EDITORIAL_TYPES = ['interview', 'news', 'review'] as const

export type HomeFeaturedHero = EditorialCardItem & {
  excerpt?: string | null
  verdict?: string | null
  featured?: boolean | null
  featureImage?: EditorialCardItem['coverImage'] | null
}

export type HomeCarouselEditorialSlide = {
  kind: 'editorial'
  item: HomeFeaturedHero
}

export type HomeCarouselEventSlide = {
  kind: 'event'
  item: ScheduleEvent
}

export type HomeCarouselSlide = HomeCarouselEditorialSlide | HomeCarouselEventSlide

export function homeCarouselSlideKey(slide: HomeCarouselSlide): string {
  return slide.kind === 'editorial' ? slide.item._id : `tm-event-${slide.item.id}`
}

/** Stable key for persisted carousel order (concert slot stays fixed when the event rotates). */
export const HOME_CAROUSEL_EVENT_SLOT_KEY = 'event'

export function homeCarouselSlideOrderKey(slide: HomeCarouselSlide): string {
  return slide.kind === 'editorial' ? slide.item._id : HOME_CAROUSEL_EVENT_SLOT_KEY
}

export function normalizeHomeCarouselOrderKey(key: string): string {
  if (key.startsWith('tm-event-')) return HOME_CAROUSEL_EVENT_SLOT_KEY
  return key
}

export function normalizeHomeCarouselSlideOrder(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const keys = value.filter((key): key is string => typeof key === 'string' && key.length > 0)
  return keys.length ? keys : null
}

export function applyHomeCarouselSlideOrder(
  slides: HomeCarouselSlide[],
  orderKeys: string[] | null | undefined,
): HomeCarouselSlide[] {
  const keys = orderKeys?.map(normalizeHomeCarouselOrderKey).filter(Boolean)
  if (!keys?.length) return slides

  const byKey = new Map(slides.map((slide) => [homeCarouselSlideOrderKey(slide), slide]))
  const ordered: HomeCarouselSlide[] = []
  const used = new Set<string>()

  for (const key of keys) {
    const slide = byKey.get(key)
    if (!slide || used.has(key)) continue
    ordered.push(slide)
    used.add(key)
  }

  for (const slide of slides) {
    const key = homeCarouselSlideOrderKey(slide)
    if (!used.has(key)) ordered.push(slide)
  }

  return ordered
}

export function homeCarouselSlideHref(slide: HomeCarouselSlide): string | null {
  if (slide.kind === 'editorial') {
    const slug = slide.item.slug?.trim()
    if (!slug) return null
    return editorialHref(slide.item._type, slug)
  }
  return eventHref(slide.item.slug)
}
