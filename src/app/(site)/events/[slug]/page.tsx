import type {Metadata} from 'next'
import {notFound, redirect} from 'next/navigation'

import {EventArticleContent} from '@/components/EventArticleContent'
import {PastEventContent} from '@/components/PastEventContent'
import {fetchEventArchiveBySlug, scheduleEventFromArchive} from '@/lib/eventArchive'
import {buildPageMetadata} from '@/lib/pageMetadata'
import {eventHref} from '@/lib/paths'
import {
  fetchEventDetailById,
  fetchEventMatchBySlug,
  fetchRelatedEvents,
  fetchScheduleEventsPage,
  fetchVenueEventsPage,
  formatScheduleEventWhen,
  formatScheduleVenue,
  getVenueIndex,
} from '@/lib/ticketmaster'

type Props = {params: Promise<{slug: string}>}

export const dynamic = 'force-dynamic'

const PAST_EVENT_RELATED_LIMIT = 6

async function loadPastEventView(slug: string) {
  const archive = await fetchEventArchiveBySlug(slug)
  if (!archive) return null

  const [venueEventsResult, areaPage, venueIndex] = await Promise.all([
    archive.venueId
      ? fetchVenueEventsPage(archive.venueId, 0)
      : Promise.resolve({events: [], hasMore: false}),
    fetchScheduleEventsPage(0),
    archive.venueId && !archive.venueSlug
      ? getVenueIndex()
      : Promise.resolve(null),
  ])

  const venueSlug =
    archive.venueSlug ??
    (archive.venueId && venueIndex && !venueIndex.error
      ? (venueIndex.byId.get(archive.venueId)?.slug ?? null)
      : null)

  return {
    archive,
    venueSlug,
    venueEvents: venueEventsResult.events.slice(0, PAST_EVENT_RELATED_LIMIT),
    areaEvents: areaPage.events.slice(0, PAST_EVENT_RELATED_LIMIT),
  }
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const match = await fetchEventMatchBySlug(slug)

  if (match && match !== 'not_configured' && match !== 'api_error') {
    const {event} = match
    const when = formatScheduleEventWhen(event)
    const venue = formatScheduleVenue(event)
    const description = venue
      ? `${when.label} at ${venue}. Tickets via Ticketmaster.`
      : `${when.label}. Tickets via Ticketmaster.`

    return buildPageMetadata({
      title: event.name,
      description,
      path: eventHref(event.slug),
    })
  }

  const past = await loadPastEventView(slug)
  if (!past) {
    return {title: 'Event not found'}
  }

  const when = formatScheduleEventWhen(scheduleEventFromArchive(past.archive))

  return {
    ...buildPageMetadata({
      title: `${past.archive.name} (past)`,
      description: `This show (${when.label}) is no longer on our schedule. Browse upcoming concerts in Philadelphia.`,
      path: eventHref(past.archive.slug),
    }),
    robots: {index: false, follow: true},
  }
}

export default async function EventDetailPage({params}: Props) {
  const {slug} = await params
  const match = await fetchEventMatchBySlug(slug)

  if (match === 'not_configured' || match === 'api_error') {
    const past = await loadPastEventView(slug)
    if (past) {
      return (
        <PastEventContent
          archive={past.archive}
          venueSlug={past.venueSlug}
          venueEvents={past.venueEvents}
          areaEvents={past.areaEvents}
        />
      )
    }

    return (
      <p className="text-sm text-zinc-500">
        Event details are unavailable right now. Please try again later.
      </p>
    )
  }

  if (!match) {
    const past = await loadPastEventView(slug)
    if (!past) notFound()

    return (
      <PastEventContent
        archive={past.archive}
        venueSlug={past.venueSlug}
        venueEvents={past.venueEvents}
        areaEvents={past.areaEvents}
      />
    )
  }

  const {event, matchedBy} = match
  if (matchedBy === 'id') {
    redirect(eventHref(event.slug))
  }

  const [detail, relatedEvents, venueIndex] = await Promise.all([
    fetchEventDetailById(event.id),
    fetchRelatedEvents(event, 3),
    event.venueId ? getVenueIndex() : Promise.resolve(null),
  ])

  if (detail === 'not_configured' || detail === 'api_error') {
    const past = await loadPastEventView(slug)
    if (past) {
      return (
        <PastEventContent
          archive={past.archive}
          venueSlug={past.venueSlug}
          venueEvents={past.venueEvents}
          areaEvents={past.areaEvents}
        />
      )
    }

    return (
      <p className="text-sm text-zinc-500">
        Event details are unavailable right now. Please try again later.
      </p>
    )
  }
  if (!detail) notFound()

  const venueSlug =
    detail.venueId && venueIndex && !venueIndex.error
      ? (venueIndex.byId.get(detail.venueId)?.slug ?? null)
      : null

  return (
    <EventArticleContent detail={detail} venueSlug={venueSlug} relatedEvents={relatedEvents} />
  )
}
