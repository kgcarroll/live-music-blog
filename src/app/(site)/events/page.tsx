import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {Suspense} from 'react'
import {ArticleBody} from '@/components/ArticleBody'
import {SchedulePageClient} from '@/components/SchedulePageClient'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {parseListPageParam} from '@/lib/listPagination'
import {fetchScheduleEventsThroughPage} from '@/lib/ticketmaster'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Events',
    path: '/events',
    introKey: 'scheduleHubPortable',
    fallbackDescription:
      'Upcoming concerts in the greater Philadelphia area from Ticketmaster, updated regularly.',
  })
}

type Props = {searchParams: Promise<{page?: string}>}

export default async function EventsPage({searchParams}: Props) {
  const {page: pageParam} = await searchParams
  const listPage = parseListPageParam(pageParam)

  const [{data: settings}, schedule] = await Promise.all([
    sanityFetch({query: SITE_SETTINGS}),
    fetchScheduleEventsThroughPage(listPage),
  ])

  const intro = (settings?.scheduleHubPortable ?? null) as TypedObject[] | null
  const fallbackIntro =
    'Upcoming music events in the greater Philadelphia area (next 30 days). Listings and tickets via Ticketmaster.'

  let emptyMessage = 'No upcoming concerts found in this date range.'
  if (schedule.error === 'not_configured') {
    emptyMessage = 'Concert schedule is not configured yet (Ticketmaster API key missing).'
  } else if (schedule.error === 'api_error') {
    emptyMessage = 'Could not load concerts right now. Please try again later.'
  }

  return (
    <Suspense fallback={null}>
      <SchedulePageClient
        initialEvents={schedule.events}
        initialHasMore={schedule.hasMore}
        initialPage={listPage}
        emptyMessage={emptyMessage}
      >
        {intro?.length ? (
          <div className="mt-6 max-w-2xl">
            <ArticleBody value={intro} />
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-zinc-400">{fallbackIntro}</p>
        )}
      </SchedulePageClient>
    </Suspense>
  )
}
