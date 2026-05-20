import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_LIST, SITE_SETTINGS} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Photos',
}

export default async function PhotosHubPage() {
  const [{data: items}, {data: settings}] = await Promise.all([
    sanityFetch({query: SECTION_LIST, params: {type: 'photoPost'}}),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  return (
    <HubSectionPage
      title="Photos"
      intro={(settings?.photosHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Live shots from the floor, the pit, and the balcony."
      items={(items ?? []) as EditorialCardItem[]}
      emptyMessage="No photo posts published yet."
    />
  )
}
