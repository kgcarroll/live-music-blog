import type {HomeCarouselSlide, HomeFeaturedHero} from '@/lib/homeFeatured'
import {HOME_CAROUSEL_EVENT_SLOT_KEY} from '@/lib/homeFeatured'
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
  pinnedEventSlug: string | null
  slideOrder: string[]
  hasDraftSlideOrder: boolean
}

export function studioHomeCarouselSlideOrderKey(slide: StudioHomeCarouselSlide): string {
  if (slide.kind === 'editorial') return slide.item._id
  return HOME_CAROUSEL_EVENT_SLOT_KEY
}

export function reorderStudioHomeCarouselSlides(
  slides: StudioHomeCarouselSlide[],
  fromIndex: number,
  toIndex: number,
): StudioHomeCarouselSlide[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slides.length ||
    toIndex >= slides.length
  ) {
    return slides
  }

  const next = [...slides]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function studioHomeCarouselOrderKeys(slides: StudioHomeCarouselSlide[]): string[] {
  return slides.map(studioHomeCarouselSlideOrderKey)
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
