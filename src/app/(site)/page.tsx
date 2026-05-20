import {HomeEditorialFeed} from '@/components/HomeEditorialFeed'
import {HomeFeaturedSlideshow} from '@/components/HomeFeaturedSlideshow'
import type {EditorialCardItem} from '@/components/EditorialCard'
import type {HomeFeaturedHero} from '@/lib/homeFeatured'
import {buildHomeCarouselSlides} from '@/lib/homeCarousel'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_CAROUSEL_BACKFILL, HOME_EDITORIAL_PAGE, HOME_FEATURED_SLIDES} from '@/sanity/lib/queries'

/** Fresher home page when you publish in Studio (layout still uses 60s elsewhere). */
export const revalidate = 30

export default async function HomePage() {
  const [{data: featured}, {data: recent}] = await Promise.all([
    sanityFetch({query: HOME_FEATURED_SLIDES}),
    sanityFetch({query: HOME_CAROUSEL_BACKFILL}),
  ])

  const slides = buildHomeCarouselSlides(
    (featured ?? []) as HomeFeaturedHero[],
    (recent ?? []) as HomeFeaturedHero[],
  )
  const excludeCarouselIds = slides.map((item) => item._id)

  const {data: grid} = await sanityFetch({
    query: HOME_EDITORIAL_PAGE,
    params: {
      start: 0,
      end: HOME_EDITORIAL_PAGE_SIZE,
      excludeIds: excludeCarouselIds,
    },
  })
  const excludeSet = new Set(excludeCarouselIds)
  const initialItems = ((grid ?? []) as EditorialCardItem[]).filter((item) => !excludeSet.has(item._id))

  return (
    <div>
      {slides.length > 0 ? <HomeFeaturedSlideshow items={slides} /> : null}
      <section className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">The latest from the pit.</h1>
        <p className="mt-3 text-balance font-bold text-amber-300">
          Interviews, news, photo galleries, and reviews from the Philadelphia area and beyond.
        </p>
      </section>
      <HomeEditorialFeed excludeCarouselIds={excludeCarouselIds} initialItems={initialItems} />
    </div>
  )
}
