import type {SanityClient} from '@sanity/client'

import {buildHomeCarouselSlides} from '@/lib/homeCarousel'
import type {HomeFeaturedHero} from '@/lib/homeFeatured'
import {HOME_CAROUSEL_BACKFILL, HOME_FEATURED_SLIDES} from '@/sanity/lib/queries'

type CarouselFetchPerspective = 'published' | 'drafts' | 'raw'

/** Editorial carousel rows only — safe to run in Sanity Studio (browser). */
export async function fetchHomeCarouselEditorialData(
  client: SanityClient,
  options: {
    featuredPerspective?: CarouselFetchPerspective
    recentPerspective?: CarouselFetchPerspective
    useCdn?: boolean
  } = {},
): Promise<{
  featured: HomeFeaturedHero[]
  recent: HomeFeaturedHero[]
  editorialSlides: HomeFeaturedHero[]
}> {
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
  const editorialSlides = buildHomeCarouselSlides(featuredRows, recentRows)

  return {
    featured: featuredRows,
    recent: recentRows,
    editorialSlides,
  }
}
