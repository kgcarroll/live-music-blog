import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import {fetchSectionEditorialThroughPage} from '@/app/(site)/listingEditorialActions'
import {parseListPageParam} from '@/lib/listPagination'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

const SECTION_TYPE = 'news'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'News',
    path: '/news',
    introKey: 'newsHubPortable',
    fallbackDescription: 'Short updates, announcements, and stories from the pit.',
  })
}

type Props = {searchParams: Promise<{page?: string}>}

export default async function NewsHubPage({searchParams}: Props) {
  const {page: pageParam} = await searchParams
  const listPage = parseListPageParam(pageParam)

  const [{items, hasMore}, {data: settings}] = await Promise.all([
    fetchSectionEditorialThroughPage(SECTION_TYPE, listPage),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="News"
      intro={(settings?.newsHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Short updates, announcements, and stories from the pit."
      sectionType={SECTION_TYPE}
      initialItems={items}
      initialHasMore={hasMore}
      initialPage={listPage}
      emptyMessage="No news posts published yet."
    />
  )
}
