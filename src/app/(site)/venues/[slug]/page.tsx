import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound, redirect} from 'next/navigation'

import {VenueDetailLayout, VenueMapStickyAside} from '@/components/VenueDetailLayout'
import {VenueDetailMapLazy} from '@/components/VenueDetailMapLazy'
import {VenueUpcomingEvents} from '@/components/VenueUpcomingEvents'
import {buildPageMetadata} from '@/lib/pageMetadata'
import {venueHref} from '@/lib/paths'
import {
  fetchVenueById,
  fetchVenueEventsPage,
  fetchVenueMapPinBySlug,
  formatVenueAddress,
} from '@/lib/ticketmaster'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

type Props = {params: Promise<{slug: string}>}

function VenueMapPanel({
  latitude,
  longitude,
  name,
  mapsQuery,
}: {
  latitude: number
  longitude: number
  name: string
  mapsQuery: string
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Location</h2>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-amber-300 transition hover:text-amber-200"
        >
          Open in Google Maps
        </a>
      </div>
      <div className="mt-3 w-full">
        <VenueDetailMapLazy latitude={latitude} longitude={longitude} name={name} />
      </div>
    </>
  )
}

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
  const [{data: settings}, match] = await Promise.all([
    sanityFetch({query: SITE_SETTINGS, stega: false}),
    fetchVenueMapPinBySlug(slug),
  ])

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
  const venueImageUrl = pin.imageUrl ?? venue.imageUrl
  const mapEnabled = settings?.venuesMapEnabled !== false
  const latitude = venue.latitude ?? pin.latitude
  const longitude = venue.longitude ?? pin.longitude
  const showMap = mapEnabled && latitude != null && longitude != null
  const mapsQuery =
    [venue.name, address].filter(Boolean).join(' ') ||
    [venue.name, pin.city, pin.state].filter(Boolean).join(' ') ||
    `${latitude},${longitude}`

  const mapPanelProps =
    latitude != null && longitude != null
      ? {
          latitude,
          longitude,
          name: venue.name,
          mapsQuery,
        }
      : null

  const venueDetails = (
    <>
      <p className="text-xs uppercase tracking-wide text-amber-300">
        <Link href="/venues" className="transition hover:text-amber-200">
          ← Venues
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">{venue.name}</h1>
      {address ? <p className="mt-3 text-zinc-400">{address}</p> : null}
      {venueImageUrl ? (
        <figure className="mt-6 max-w-2xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- Google Places / Ticketmaster CDN */}
            <img
              src={venueImageUrl}
              alt={venue.name}
              width={pin.imageWidth ?? undefined}
              height={pin.imageHeight ?? undefined}
              className="h-full w-full object-cover"
              decoding="async"
            />
          </div>
          {pin.imageSource === 'google_places' && pin.imageAttribution ? (
            <figcaption className="mt-2 text-xs text-zinc-600">
              Photo: {pin.imageAttribution}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
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
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Parking</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{venue.parkingDetail}</p>
        </section>
      ) : null}

      {venue.accessibleSeatingDetail ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accessibility</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{venue.accessibleSeatingDetail}</p>
        </section>
      ) : null}

      {venue.boxOfficeHours ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Box office</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{venue.boxOfficeHours}</p>
        </section>
      ) : null}
    </>
  )

  const upcomingShows = (
    <section className="w-full" aria-labelledby="venue-upcoming-heading">
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
  )

  return (
    <VenueDetailLayout
      details={venueDetails}
      mapAside={
        showMap && mapPanelProps ? (
          <VenueMapStickyAside>
            <VenueMapPanel {...mapPanelProps} />
          </VenueMapStickyAside>
        ) : undefined
      }
      mapMobile={showMap && mapPanelProps ? <VenueMapPanel {...mapPanelProps} /> : undefined}
      below={upcomingShows}
    />
  )
}
