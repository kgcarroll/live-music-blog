import Link from 'next/link'

import {EventDetailExtra} from '@/components/EventDetailExtra'
import {EventSpotifyMobilePanel, EventSpotifyStickyAside} from '@/components/EventSpotifyArtists'
import {ScheduleEventCard} from '@/components/ScheduleEventCard'
import {VenueDetailLayout} from '@/components/VenueDetailLayout'
import type {TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'
import {
  formatScheduleEventWhen,
  formatScheduleVenue,
  type EventDetail,
  type ScheduleEvent,
} from '@/lib/ticketmaster'
import {venueHref} from '@/lib/paths'

export function EventArticleContent({
  detail,
  venueSlug,
  relatedEvents,
  attractions,
  isPast = false,
  relatedSectionTitle,
}: {
  detail: EventDetail
  venueSlug: string | null
  relatedEvents: ScheduleEvent[]
  attractions: TicketmasterAttractionRef[]
  isPast?: boolean
  relatedSectionTitle?: string
}) {
  const when = formatScheduleEventWhen(detail)
  const venueLabel = formatScheduleVenue(detail)
  const showStatusInHero =
    detail.statusLabel && detail.statusLabel.toLowerCase() !== 'on sale'

  const eventDetails = (
    <>
      <p className="text-xs uppercase tracking-wide text-amber-300">
        <Link href="/events" className="transition hover:text-amber-200">
          ← All upcoming shows
        </Link>
      </p>

      {isPast ? (
        <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This show is no longer on our schedule (or has passed).
        </p>
      ) : null}

      <p className={isPast ? 'mt-3 text-sm text-zinc-400' : 'mt-6 text-sm text-zinc-400'}>
        <span className="uppercase tracking-wide text-amber-300">Concert</span>
        <span className="mx-1.5 text-zinc-600" aria-hidden="true">
          |
        </span>
        <time className="tabular-nums" dateTime={when.dateTime}>
          {when.label}
        </time>
        {detail.priceSummary ? (
          <>
            <span className="mx-1.5 text-zinc-600" aria-hidden="true">
              |
            </span>
            <span className="tabular-nums">From {detail.priceSummary}</span>
          </>
        ) : null}
        {showStatusInHero ? (
          <>
            <span className="mx-1.5 text-zinc-600" aria-hidden="true">
              |
            </span>
            <span className="text-amber-200">{detail.statusLabel}</span>
          </>
        ) : null}
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">{detail.name}</h1>

      {venueLabel ? (
        <p className="mt-3 text-zinc-400">
          {isPast ? 'Was at ' : 'At '}
          {venueSlug ? (
            <Link href={venueHref(venueSlug)} className="transition hover:text-amber-200">
              {venueLabel}
            </Link>
          ) : (
            venueLabel
          )}
        </p>
      ) : null}

      {detail.venueAddress ? <p className="mt-3 text-zinc-400">{detail.venueAddress}</p> : null}

      {detail.url ? (
        <p className="mt-4">
          <a
            href={detail.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200"
          >
            {isPast ? 'View on Ticketmaster' : 'Get tickets on Ticketmaster'}
          </a>
        </p>
      ) : null}

      {detail.imageUrl ? (
        <div
          className={`relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900${
            isPast ? ' opacity-90' : ''
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN */}
          <img
            src={detail.imageUrl}
            alt=""
            width={detail.imageWidth ?? undefined}
            height={detail.imageHeight ?? undefined}
            sizes="(max-width: 1024px) 100vw, 896px"
            className={`h-full w-full object-cover${isPast ? ' grayscale-[20%]' : ''}`}
            decoding="async"
          />
        </div>
      ) : null}

      <div className={detail.imageUrl ? 'mt-10' : 'mt-8'}>
        <EventDetailExtra detail={detail} venueSlug={venueSlug} attractions={attractions} />
      </div>
    </>
  )

  const spotifyAside = attractions.length ? (
    <EventSpotifyStickyAside eventId={detail.id} attractions={attractions} />
  ) : null

  const spotifyMobile = attractions.length ? (
    <EventSpotifyMobilePanel eventId={detail.id} attractions={attractions} />
  ) : null

  const relatedSection = relatedEvents.length ? (
    <section className="w-full" aria-labelledby="related-events-heading">
      <h2 id="related-events-heading" className="text-2xl font-semibold tracking-tight text-zinc-50">
        {relatedSectionTitle ?? 'Related events'}
      </h2>
      <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
        {relatedEvents.map((event) => (
          <ScheduleEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  ) : null

  return (
    <VenueDetailLayout
      details={eventDetails}
      mapAside={spotifyAside ?? undefined}
      mapMobile={spotifyMobile ?? undefined}
      below={relatedSection}
    />
  )
}
