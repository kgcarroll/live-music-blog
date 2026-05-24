import {NextResponse} from 'next/server'

import {fetchHomeCarouselSourceData} from '@/lib/fetchHomeCarousel'
import {normalizeHomeCarouselSlideOrder} from '@/lib/homeFeatured'
import {
  serializeStudioHomeCarouselSlides,
  type StudioHomeCarouselResponse,
} from '@/lib/studioHomeCarousel'
import {client} from '@/sanity/lib/client'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const dynamic = 'force-dynamic'

type SiteSettingsCarousel = {
  homepageCarouselEventSlug?: string | null
  homepageCarouselSlideOrder?: string[] | null
}

function normalizeSlideOrder(value: unknown): string[] {
  return normalizeHomeCarouselSlideOrder(value) ?? []
}

export async function GET() {
  try {
    const settings = await client.fetch<SiteSettingsCarousel>(
      SITE_SETTINGS,
      {},
      {perspective: 'published', useCdn: false},
    )

    const pinnedEventSlug =
      typeof settings?.homepageCarouselEventSlug === 'string'
        ? settings.homepageCarouselEventSlug
        : null
    const publishedSlideOrder = normalizeSlideOrder(settings?.homepageCarouselSlideOrder)

    const draftSettings = await client.fetch<SiteSettingsCarousel>(
      SITE_SETTINGS,
      {},
      {perspective: 'drafts', useCdn: false},
    )
    const draftSlideOrder = normalizeSlideOrder(draftSettings?.homepageCarouselSlideOrder)
    const displaySlideOrder = draftSlideOrder.length ? draftSlideOrder : publishedSlideOrder

    const published = await fetchHomeCarouselSourceData(client, {
      featuredPerspective: 'published',
      recentPerspective: 'published',
      useCdn: false,
      pinnedEventSlug,
      slideOrder: displaySlideOrder.length ? displaySlideOrder : null,
    })

    const body: StudioHomeCarouselResponse = {
      slides: serializeStudioHomeCarouselSlides(published.slides),
      editorialSlides: published.editorialSlides,
      eventIncluded: published.eventIncluded,
      eventPinned: published.eventPinned,
      pinnedEventSlug,
      slideOrder: displaySlideOrder,
      hasDraftSlideOrder:
        draftSlideOrder.length > 0 &&
        JSON.stringify(draftSlideOrder) !== JSON.stringify(publishedSlideOrder),
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
