import type {HomeCarouselSlide, HomeFeaturedHero} from '@/lib/homeFeatured'
import {formatScheduleEventWhen, formatScheduleVenue} from '@/lib/ticketmaster'

export type StudioHomeCarouselEventItem = {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  whenLabel: string
  venueLabel: string | null
}

export type StudioHomeCarouselSlide =
  | {kind: 'editorial'; item: HomeFeaturedHero}
  | {kind: 'event'; item: StudioHomeCarouselEventItem}

export type StudioHomeCarouselResponse = {
  slides: StudioHomeCarouselSlide[]
  editorialSlides: HomeFeaturedHero[]
  eventIncluded: boolean
  eventPinned: boolean
  carouselEventSeed: number
  pinnedEventSlug: string | null
}

export function serializeStudioHomeCarouselSlides(
  slides: HomeCarouselSlide[],
): StudioHomeCarouselSlide[] {
  return slides.map((slide) => {
    if (slide.kind === 'editorial') {
      return slide
    }

    return {
      kind: 'event',
      item: {
        id: slide.item.id,
        slug: slide.item.slug,
        name: slide.item.name,
        imageUrl: slide.item.imageUrl,
        whenLabel: formatScheduleEventWhen(slide.item).label,
        venueLabel: formatScheduleVenue(slide.item),
      },
    }
  })
}

export function studioHomeCarouselApiUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/studio/homepage-carousel`
}

export async function fetchStudioHomeCarouselFromApi(
  origin: string,
): Promise<StudioHomeCarouselResponse | null> {
  try {
    const response = await fetch(studioHomeCarouselApiUrl(origin), {cache: 'no-store'})
    if (!response.ok) return null
    return (await response.json()) as StudioHomeCarouselResponse
  } catch {
    return null
  }
}

export function studioApiOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}
