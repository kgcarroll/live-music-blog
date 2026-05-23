import type {EditorialCardItem} from '@/components/EditorialCard'
import type {ScheduleEvent} from '@/lib/ticketmaster'
import {editorialHref, eventHref} from '@/lib/paths'

/** Editorial types that support homepage featuring. */
export const EDITORIAL_TYPES = ['interview', 'news', 'photoPost', 'review'] as const

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

export function homeCarouselSlideHref(slide: HomeCarouselSlide): string | null {
  if (slide.kind === 'editorial') {
    const slug = slide.item.slug?.trim()
    if (!slug) return null
    return editorialHref(slide.item._type, slug)
  }
  return eventHref(slide.item.slug)
}
