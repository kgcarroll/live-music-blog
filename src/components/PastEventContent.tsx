import Link from 'next/link'

import {ScheduleEventCard} from '@/components/ScheduleEventCard'
import {VenueDetailLayout} from '@/components/VenueDetailLayout'
import {
  type EventArchiveRecord,
  scheduleEventFromArchive,
} from '@/lib/eventArchive'
import {venueHref} from '@/lib/paths'
import {
  formatScheduleEventWhen,
  formatScheduleVenue,
  type ScheduleEvent,
} from '@/lib/ticketmaster'

export function PastEventContent({
  archive,
  venueSlug,
  venueEvents,
}: {
  archive: EventArchiveRecord
  venueSlug: string | null
  venueEvents: ScheduleEvent[]
}) {
  const event = scheduleEventFromArchive(archive)
  const when = formatScheduleEventWhen(event)
  const venueLabel = formatScheduleVenue(event)
  const venueEventsDeduped = venueEvents.filter((item) => item.id !== archive.eventId)

  const eventDetails = (
    <>
      <p className="text-xs uppercase tracking-wide text-amber-300">
        <Link href="/events" className="transition hover:text-amber-200">
          ← All upcoming shows
        </Link>
      </p>

      <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        This show is no longer on our schedule (or has passed).
      </p>

      <p className="mt-3 text-sm text-zinc-400">
        <span className="uppercase tracking-wide text-amber-300">Concert</span>
        <span className="mx-1.5 text-zinc-600" aria-hidden="true">
          |
        </span>
        <time className="tabular-nums" dateTime={when.dateTime}>
          {when.label}
        </time>
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">{archive.name}</h1>

      {venueLabel ? (
        <p className="mt-3 text-zinc-400">
          Was at{' '}
          {venueSlug ? (
            <Link href={venueHref(venueSlug)} className="transition hover:text-amber-200">
              {venueLabel}
            </Link>
          ) : (
            venueLabel
          )}
        </p>
      ) : null}

      {archive.ticketmasterUrl ? (
        <p className="mt-4">
          <a
            href={archive.ticketmasterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200"
          >
            View on Ticketmaster
          </a>
        </p>
      ) : null}

      {archive.imageUrl ? (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN */}
          <img
            src={archive.imageUrl}
            alt=""
            className="h-full w-full object-cover grayscale-[20%]"
            decoding="async"
          />
        </div>
      ) : null}
    </>
  )

  const venueSection = venueEventsDeduped.length ? (
    <section className="w-full" aria-labelledby="venue-events-heading">
      <h2 id="venue-events-heading" className="text-2xl font-semibold tracking-tight text-zinc-50">
        {archive.venueName
          ? `Upcoming shows at ${archive.venueName}`
          : 'Upcoming shows at this venue'}
      </h2>
      <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
        {venueEventsDeduped.map((item) => (
          <ScheduleEventCard key={item.id} event={item} />
        ))}
      </div>
    </section>
  ) : null

  return <VenueDetailLayout details={eventDetails} below={venueSection} />
}
