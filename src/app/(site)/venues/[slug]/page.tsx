import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound, redirect} from 'next/navigation'

import {VenueUpcomingEvents} from '@/components/VenueUpcomingEvents'
import {buildPageMetadata} from '@/lib/pageMetadata'
import {venueHref} from '@/lib/paths'
import {
  fetchVenueById,
  fetchVenueEventsPage,
  fetchVenueMapPinBySlug,
  formatVenueAddress,
} from '@/lib/ticketmaster'

type Props = {params: Promise<{slug: string}>}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const match = await fetchVenueMapPinBySlug(slug)
  if (!match || match === 'not_configured' || match === 'api_error') {
    return {title: 'Venue not found'}
  }

  const {pin} = match
  const place = [pin.city, pin.state].filter(Boolean).join(', ')
  const description = place
    ? `Upcoming concerts at ${pin.name} in ${place}.`
    : `Upcoming concerts at ${pin.name}.`

  return buildPageMetadata({
    title: pin.name,
    description,
    path: venueHref(pin.slug),
  })
}

export default async function VenueDetailPage({params}: Props) {
  const {slug} = await params
  const match = await fetchVenueMapPinBySlug(slug)

  if (match === 'not_configured' || match === 'api_error') {
    return (
      <p className="text-sm text-zinc-500">
        Venue details are unavailable right now. Please try again later.
      </p>
    )
  }

  if (!match) notFound()

  const {pin, matchedBy} = match
  if (matchedBy === 'id') {
    redirect(venueHref(pin.slug))
  }

  const [venue, eventsResult] = await Promise.all([
    fetchVenueById(pin.id),
    fetchVenueEventsPage(pin.id, 0),
  ])

  if (venue === 'not_configured' || venue === 'api_error') {
    return (
      <p className="text-sm text-zinc-500">
        Venue details are unavailable right now. Please try again later.
      </p>
    )
  }

  if (!venue) notFound()

  const address = formatVenueAddress(venue)

  return (
    <article className="pb-16">
      <p className="text-xs uppercase tracking-wide text-amber-300">
        <Link href="/venues" className="transition hover:text-amber-200">
          ← Venues
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">{venue.name}</h1>
      {address ? <p className="mt-3 text-zinc-400">{address}</p> : null}
      {venue.url ? (
        <p className="mt-4">
          <a
            href={venue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200"
          >
            Venue on Ticketmaster
          </a>
        </p>
      ) : null}

      {venue.parkingDetail ? (
        <section className="mt-8 max-w-2xl">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Parking</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{venue.parkingDetail}</p>
        </section>
      ) : null}

      {venue.accessibleSeatingDetail ? (
        <section className="mt-6 max-w-2xl">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accessibility</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{venue.accessibleSeatingDetail}</p>
        </section>
      ) : null}

      {venue.boxOfficeHours ? (
        <section className="mt-6 max-w-2xl">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Box office</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{venue.boxOfficeHours}</p>
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="venue-upcoming-heading">
        <h2 id="venue-upcoming-heading" className="text-2xl font-semibold tracking-tight text-zinc-50">
          Upcoming shows
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Music events in the next 30 days.</p>
        <VenueUpcomingEvents
          venueId={venue.id}
          initialEvents={eventsResult.events}
          initialHasMore={eventsResult.hasMore}
        />
      </section>
    </article>
  )
}
