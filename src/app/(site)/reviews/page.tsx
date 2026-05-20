import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_LIST, SITE_SETTINGS} from '@/sanity/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Reviews',
    path: '/reviews',
    introKey: 'reviewsHubPortable',
    fallbackDescription: 'Honest takes on the shows we catch - sound, energy, and crowd.',
  })
}

export default async function ReviewsHubPage() {
  const [{data: items}, {data: settings}] = await Promise.all([
    sanityFetch({query: SECTION_LIST, params: {type: 'review'}}),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="Reviews"
      intro={(settings?.reviewsHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Honest takes on the shows we catch - sound, energy, and crowd."
      items={(items ?? []) as EditorialCardItem[]}
      emptyMessage="No reviews published yet."
    />
  )
}
