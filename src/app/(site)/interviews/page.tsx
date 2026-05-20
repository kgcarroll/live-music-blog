import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_LIST, SITE_SETTINGS} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Interviews',
}

export default async function InterviewsHubPage() {
  const [{data: items}, {data: settings}] = await Promise.all([
    sanityFetch({query: SECTION_LIST, params: {type: 'interview'}}),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="Interviews"
      intro={(settings?.interviewsHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Conversations with promoters and people behind the scenes."
      items={(items ?? []) as EditorialCardItem[]}
      emptyMessage="No interviews published yet."
    />
  )
}
