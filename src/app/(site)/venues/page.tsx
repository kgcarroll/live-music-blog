import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {Suspense} from 'react'
import {ArticleBody} from '@/components/ArticleBody'
import {VenuesPageClient} from '@/components/VenuesPageClient'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {fetchVenuesFromUpcomingMusic} from '@/lib/ticketmaster'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Venues',
    path: '/venues',
    introKey: 'venuesHubPortable',
    fallbackDescription:
      'Map of venues with upcoming concerts in the greater Philadelphia area (next 30 days).',
  })
}

export default async function VenuesPage() {
  const [{data: settings}, venuesResult] = await Promise.all([
    sanityFetch({query: SITE_SETTINGS}),
    fetchVenuesFromUpcomingMusic(),
  ])

  const intro = (settings?.venuesHubPortable ?? null) as TypedObject[] | null
  const fallbackIntro =
    'Venues hosting upcoming music shows in the next 30 days. Data from Ticketmaster; same coverage as the schedule.'

  let emptyMessage = 'No venues with upcoming music shows in this date range.'
  if (venuesResult.error === 'not_configured') {
    emptyMessage = 'Venues map is not configured yet (Ticketmaster API key missing).'
  } else if (venuesResult.error === 'api_error') {
    emptyMessage = 'Could not load venues right now. Please try again later.'
  }

  const venues = venuesResult.venues
  const mapEnabled = settings?.venuesMapEnabled !== false

  return (
    <Suspense fallback={null}>
      <VenuesPageClient venues={venues} emptyMessage={emptyMessage} mapEnabled={mapEnabled}>
        {intro?.length ? (
          <div className="mt-6 max-w-2xl">
            <ArticleBody value={intro} />
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-zinc-400">{fallbackIntro}</p>
        )}
      </VenuesPageClient>
    </Suspense>
  )
}
