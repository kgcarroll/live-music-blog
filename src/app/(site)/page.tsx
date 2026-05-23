import type {Metadata} from 'next'
import {HomeEditorialFeed} from '@/components/HomeEditorialFeed'
import {HomeFeaturedSlideshow} from '@/components/HomeFeaturedSlideshow'
import {JsonLd} from '@/components/JsonLd'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {buildWebSiteJsonLd} from '@/lib/editorialJsonLd'
import {fetchHomeCarouselSourceData} from '@/lib/fetchHomeCarousel'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {
  buildPageMetadata,
  homepageOgImageFromSiteSettings,
  type SiteSettingsOgImage,
} from '@/lib/pageMetadata'
import {client} from '@/sanity/lib/client'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_EDITORIAL_PAGE, SITE_SETTINGS} from '@/sanity/lib/queries'

/** Fresher home page when you publish in Studio (layout still uses 60s elsewhere). */
export const revalidate = 30

const HOME_DESCRIPTION =
  'Interviews, news, photo galleries, and reviews from the Philadelphia area and beyond.'

export async function generateMetadata(): Promise<Metadata> {
  const {data: settings} = await sanityFetch({query: SITE_SETTINGS, stega: false})
  const siteTitle = settings?.siteTitle?.trim() || 'Live Music Blog'

  return {
    ...buildPageMetadata({
      title: siteTitle,
      description: HOME_DESCRIPTION,
      path: '/',
      ogImage: homepageOgImageFromSiteSettings((settings ?? null) as SiteSettingsOgImage),
    }),
    title: {absolute: siteTitle},
  }
}

export default async function HomePage() {
  const {data: settings} = await sanityFetch({query: SITE_SETTINGS, stega: false})
  const carouselEventSeed =
    typeof settings?.homepageCarouselEventSeed === 'number'
      ? settings.homepageCarouselEventSeed
      : 0
  const pinnedEventSlug =
    typeof settings?.homepageCarouselEventSlug === 'string'
      ? settings.homepageCarouselEventSlug
      : null

  const {slides} = await fetchHomeCarouselSourceData(client, {
    featuredPerspective: 'published',
    recentPerspective: 'published',
    useCdn: false,
    carouselEventSeed,
    pinnedEventSlug,
  })

  const siteTitle = settings?.siteTitle?.trim() || 'Live Music Blog'
  const webSiteJsonLd = buildWebSiteJsonLd({siteTitle, description: HOME_DESCRIPTION})
  const excludeCarouselIds = slides
    .filter((slide) => slide.kind === 'editorial')
    .map((slide) => slide.item._id)

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
      <JsonLd data={webSiteJsonLd} />
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
