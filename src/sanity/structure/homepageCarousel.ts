import type {StructureBuilder, StructureResolverContext} from 'sanity/structure'

import {fetchHomeCarouselSourceData} from '@/lib/fetchHomeCarousel'
import {homepageCarouselListTitle} from '@/lib/homeCarousel'
import {apiVersion} from '@/sanity/lib/client'

export async function homepageCarouselList(
  S: StructureBuilder,
  context: StructureResolverContext,
) {
  const client = context.getClient({apiVersion})

  /** Published = matches the live homepage carousel. */
  const published = await fetchHomeCarouselSourceData(client, {
    featuredPerspective: 'published',
    recentPerspective: 'published',
    useCdn: false,
  })

  /**
   * Preview drafts so editors see every post they've marked Featured, including
   * changes not published yet (those won't appear on the site until publish).
   */
  const preview = await fetchHomeCarouselSourceData(client, {
    featuredPerspective: 'drafts',
    recentPerspective: 'published',
    useCdn: false,
  })

  const slides =
    preview.slides.length > published.slides.length ? preview.slides : published.slides
  const ids = slides.map((item) => item._id).filter(Boolean)
  const unpublishedCount = preview.slides.length - published.slides.length

  if (!ids.length) {
    return S.documentList()
      .title('Homepage Carousel')
      .filter('_id in $ids')
      .params({ids: ['__homepage_carousel_empty__']})
  }

  let title = homepageCarouselListTitle(slides, preview.featured)
  if (unpublishedCount > 0) {
    title += ` · ${unpublishedCount} featured not on site yet (publish to show)`
  }

  return S.documentList()
    .title(title)
    .filter('_id in $ids')
    .params({ids})
    .defaultOrdering([
      {field: 'featured', direction: 'desc'},
      {field: 'publishedAt', direction: 'desc'},
    ])
}
