import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import {fetchSectionEditorialThroughPage} from '@/app/(site)/listingEditorialActions'
import {parseListPageParam} from '@/lib/listPagination'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

const SECTION_TYPE = 'interview'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Interviews',
    path: '/interviews',
    introKey: 'interviewsHubPortable',
    fallbackDescription: 'Conversations with promoters and people behind the scenes.',
  })
}

type Props = {searchParams: Promise<{page?: string}>}

export default async function InterviewsHubPage({searchParams}: Props) {
  const {page: pageParam} = await searchParams
  const listPage = parseListPageParam(pageParam)

  const [{items, hasMore}, {data: settings}] = await Promise.all([
    fetchSectionEditorialThroughPage(SECTION_TYPE, listPage),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="Interviews"
      intro={(settings?.interviewsHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Conversations with promoters and people behind the scenes."
      sectionType={SECTION_TYPE}
      initialItems={items}
      initialHasMore={hasMore}
      initialPage={listPage}
      emptyMessage="No interviews published yet."
    />
  )
}
