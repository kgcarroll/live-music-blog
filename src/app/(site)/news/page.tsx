import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_LIST, SITE_SETTINGS} from '@/sanity/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'News',
    path: '/news',
    introKey: 'newsHubPortable',
    fallbackDescription: 'Short updates, announcements, and stories from the pit.',
  })
}

export default async function NewsHubPage() {
  const [{data: items}, {data: settings}] = await Promise.all([
    sanityFetch({query: SECTION_LIST, params: {type: 'news'}}),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="News"
      intro={(settings?.newsHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Short updates, announcements, and stories from the pit."
      items={(items ?? []) as EditorialCardItem[]}
      emptyMessage="No news posts published yet."
    />
  )
}
