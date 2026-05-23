import type {SanityClient} from '@sanity/client'

import {buildHomeCarouselSlidesWithEvent} from '@/lib/homeCarouselEvent'
import type {HomeCarouselSlide, HomeFeaturedHero} from '@/lib/homeFeatured'
import {HOME_CAROUSEL_BACKFILL, HOME_FEATURED_SLIDES} from '@/sanity/lib/queries'

type CarouselFetchPerspective = 'published' | 'drafts' | 'raw'

export type HomeCarouselSourceData = {
  featured: HomeFeaturedHero[]
  recent: HomeFeaturedHero[]
  /** Editorial-only slides (featured + backfill), for Studio carousel list. */
  editorialSlides: HomeFeaturedHero[]
  slides: HomeCarouselSlide[]
  eventIncluded: boolean
  eventPinned: boolean
}

export async function fetchHomeCarouselSourceData(
  client: SanityClient,
  options: {
    featuredPerspective?: CarouselFetchPerspective
    recentPerspective?: CarouselFetchPerspective
    useCdn?: boolean
    /** From Site Settings — increment to reshuffle the homepage concert slide. */
    carouselEventSeed?: number | null
    /** From Site Settings — when set, pin this event slug (must have image). */
    pinnedEventSlug?: string | null
  } = {},
): Promise<HomeCarouselSourceData> {
  const {
    featuredPerspective = 'published',
    recentPerspective = 'published',
    useCdn = false,
    carouselEventSeed,
    pinnedEventSlug,
  } = options

  const fetchClient = useCdn ? client : client.withConfig({useCdn: false})

  const [featured, recent] = await Promise.all([
    fetchClient.fetch<HomeFeaturedHero[]>(HOME_FEATURED_SLIDES, {}, {perspective: featuredPerspective}),
    fetchClient.fetch<HomeFeaturedHero[]>(HOME_CAROUSEL_BACKFILL, {}, {perspective: recentPerspective}),
  ])

  const featuredRows = featured ?? []
  const recentRows = recent ?? []
  const {editorialSlides, slides, eventIncluded, eventPinned} =
    await buildHomeCarouselSlidesWithEvent(featuredRows, recentRows, {
      carouselEventSeed,
      pinnedEventSlug,
    })

  return {
    featured: featuredRows,
    recent: recentRows,
    editorialSlides,
    slides,
    eventIncluded,
    eventPinned,
  }
}
