import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {HubSectionPage} from '@/components/HubSectionPage'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {SECTION_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_EDITORIAL_PAGE, SITE_SETTINGS} from '@/sanity/lib/queries'

const SECTION_TYPE = 'photoPost'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Photos',
    path: '/photos',
    introKey: 'photosHubPortable',
    fallbackDescription: 'Live shots from the floor, the pit, and the balcony.',
  })
}

export default async function PhotosHubPage() {
  const [{data: rows}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: SECTION_EDITORIAL_PAGE,
      params: {type: SECTION_TYPE, start: 0, end: SECTION_EDITORIAL_PAGE_SIZE + 1},
    }),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  const items = ((rows ?? []) as EditorialCardItem[]).slice(0, SECTION_EDITORIAL_PAGE_SIZE)
  const hasMore = (rows ?? []).length > SECTION_EDITORIAL_PAGE_SIZE

  return (
    <HubSectionPage
      title="Photos"
      intro={(settings?.photosHubPortable ?? null) as TypedObject[] | null}
      fallbackIntro="Live shots from the floor, the pit, and the balcony."
      sectionType={SECTION_TYPE}
      initialItems={items}
      initialHasMore={hasMore}
      emptyMessage="No photo posts published yet."
    />
  )
}
