import type {Metadata} from 'next'
import {notFound, redirect} from 'next/navigation'

import {EventArticleContent} from '@/components/EventArticleContent'
import {buildPageMetadata} from '@/lib/pageMetadata'
import {eventHref} from '@/lib/paths'
import {
  fetchEventDetailById,
  fetchEventMatchBySlug,
  fetchRelatedEvents,
  formatScheduleEventWhen,
  formatScheduleVenue,
  getVenueIndex,
} from '@/lib/ticketmaster'

type Props = {params: Promise<{slug: string}>}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const match = await fetchEventMatchBySlug(slug)
  if (!match || match === 'not_configured' || match === 'api_error') {
    return {title: 'Event not found'}
  }

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

export default async function EventDetailPage({params}: Props) {
  const {slug} = await params
  const match = await fetchEventMatchBySlug(slug)

  if (match === 'not_configured' || match === 'api_error') {
    return (
      <p className="text-sm text-zinc-500">
        Event details are unavailable right now. Please try again later.
      </p>
    )
  }

  if (!match) notFound()

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
    return (
      <p className="text-sm text-zinc-500">
        Event details are unavailable right now. Please try again later.
      </p>
    )
  }
  if (!detail) notFound()

  const venueSlug =
    detail.venueId && venueIndex && !venueIndex.error
      ? venueIndex.byId.get(detail.venueId)?.slug ?? null
      : null

  return (
    <EventArticleContent detail={detail} venueSlug={venueSlug} relatedEvents={relatedEvents} />
  )
}
