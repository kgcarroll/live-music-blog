import {buildRssFeedXml, type RssEditorialItem} from '@/lib/rssFeed'
import {normalizeDescription} from '@/lib/portableTextPlain'
import {absoluteSiteUrl, siteOrigin} from '@/lib/siteUrl'
import {sanityFetch} from '@/sanity/lib/live'
import {RSS_EDITORIAL_FEED, SITE_SETTINGS} from '@/sanity/lib/queries'

export const revalidate = 3600

export async function GET() {
  const [{data: settings}, {data: posts}] = await Promise.all([
    sanityFetch({query: SITE_SETTINGS, perspective: 'published', stega: false}),
    sanityFetch({query: RSS_EDITORIAL_FEED, perspective: 'published', stega: false}),
  ])

  const siteTitle = settings?.siteTitle?.trim() || 'Live Music Blog'
  const siteUrl = siteOrigin()
  const feedUrl = absoluteSiteUrl('/feed.xml')
  const description =
    normalizeDescription(
      'Interviews, news, and reviews from the greater Philadelphia live music scene.',
    ) ?? 'Live music interviews, news, and reviews.'

  const xml = buildRssFeedXml(
    {
      title: siteTitle,
      description,
      siteUrl,
      feedUrl,
    },
    (posts ?? []) as RssEditorialItem[],
  )

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
