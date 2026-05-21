import type {SanityClient} from '@sanity/client'

import type {HomeFeaturedHero} from '@/lib/homeFeatured'
import {buildHomeCarouselSlides} from '@/lib/homeCarousel'
import {HOME_CAROUSEL_BACKFILL, HOME_FEATURED_SLIDES} from '@/sanity/lib/queries'

type CarouselFetchPerspective = 'published' | 'drafts' | 'raw'

export type HomeCarouselSourceData = {
  featured: HomeFeaturedHero[]
  recent: HomeFeaturedHero[]
  slides: HomeFeaturedHero[]
}

export async function fetchHomeCarouselSourceData(
  client: SanityClient,
  options: {
    featuredPerspective?: CarouselFetchPerspective
    recentPerspective?: CarouselFetchPerspective
    useCdn?: boolean
  } = {},
): Promise<HomeCarouselSourceData> {
  const {
    featuredPerspective = 'published',
    recentPerspective = 'published',
    useCdn = false,
  } = options

  const fetchClient = useCdn ? client : client.withConfig({useCdn: false})

  const [featured, recent] = await Promise.all([
    fetchClient.fetch<HomeFeaturedHero[]>(HOME_FEATURED_SLIDES, {}, {perspective: featuredPerspective}),
    fetchClient.fetch<HomeFeaturedHero[]>(HOME_CAROUSEL_BACKFILL, {}, {perspective: recentPerspective}),
  ])

  const featuredRows = featured ?? []
  const recentRows = recent ?? []
  const slides = buildHomeCarouselSlides(featuredRows, recentRows)

  return {featured: featuredRows, recent: recentRows, slides}
}
