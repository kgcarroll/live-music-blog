import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import {fetchSectionEditorialThroughPage} from '@/app/(site)/listingEditorialActions'
import {parseListPageParam} from '@/lib/listPagination'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

const SECTION_TYPE = 'review'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Reviews',
    path: '/reviews',
    introKey: 'reviewsHubPortable',
    fallbackDescription: 'Honest takes on the shows we catch - sound, energy, and crowd.',
  })
}

type Props = {searchParams: Promise<{page?: string}>}

export default async function ReviewsHubPage({searchParams}: Props) {
  const {page: pageParam} = await searchParams
  const listPage = parseListPageParam(pageParam)

  const [{items, hasMore}, {data: settings}] = await Promise.all([
    fetchSectionEditorialThroughPage(SECTION_TYPE, listPage),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="Reviews"
      intro={(settings?.reviewsHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Honest takes on the shows we catch - sound, energy, and crowd."
      sectionType={SECTION_TYPE}
      initialItems={items}
      initialHasMore={hasMore}
      initialPage={listPage}
      emptyMessage="No reviews published yet."
    />
  )
}
