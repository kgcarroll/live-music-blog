import {NextResponse} from 'next/server'

import {fetchHomeCarouselSourceData} from '@/lib/fetchHomeCarousel'
import {
  serializeStudioHomeCarouselSlides,
  type StudioHomeCarouselResponse,
} from '@/lib/studioHomeCarousel'
import {client} from '@/sanity/lib/client'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const dynamic = 'force-dynamic'

type SiteSettingsCarousel = {
  homepageCarouselEventSeed?: number | null
  homepageCarouselEventSlug?: string | null
}

export async function GET() {
  try {
    const settings = await client.fetch<SiteSettingsCarousel>(
      SITE_SETTINGS,
      {},
      {perspective: 'published', useCdn: false},
    )

    const carouselEventSeed =
      typeof settings?.homepageCarouselEventSeed === 'number'
        ? settings.homepageCarouselEventSeed
        : 0
    const pinnedEventSlug =
      typeof settings?.homepageCarouselEventSlug === 'string'
        ? settings.homepageCarouselEventSlug
        : null

    const published = await fetchHomeCarouselSourceData(client, {
      featuredPerspective: 'published',
      recentPerspective: 'published',
      useCdn: false,
      carouselEventSeed,
      pinnedEventSlug,
    })

    const body: StudioHomeCarouselResponse = {
      slides: serializeStudioHomeCarouselSlides(published.slides),
      editorialSlides: published.editorialSlides,
      eventIncluded: published.eventIncluded,
      eventPinned: published.eventPinned,
      carouselEventSeed,
      pinnedEventSlug,
    }

    return NextResponse.json(body)
  } catch (error) {
    console.error('[api/studio/homepage-carousel]', error)
    return NextResponse.json(
      {error: 'server_error', message: 'Failed to build homepage carousel.'},
      {status: 500},
    )
  }
}
