import Link from 'next/link'

import {ScheduleEventCard} from '@/components/ScheduleEventCard'
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

  return (
    <article className="pb-16">
      <div className="bg-zinc-950/80">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            This show is no longer on our schedule (or has passed).
          </p>
          <p className="mt-6 text-xs leading-snug text-zinc-400">
            <span className="uppercase tracking-wide text-amber-300">Concert</span>
            <span className="mx-1.5 text-zinc-600" aria-hidden="true">
              |
            </span>
            <time className="tabular-nums text-zinc-400" dateTime={when.dateTime}>
              {when.label}
            </time>
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
            {archive.name}
          </h1>
          {venueLabel ? (
            <p className="mt-3 text-sm text-zinc-400">
              Was at{' '}
              {venueSlug ? (
                <Link
                  href={venueHref(venueSlug)}
                  className="text-zinc-400 transition-colors hover:text-amber-200"
                >
                  {venueLabel}
                </Link>
              ) : (
                <span className="text-zinc-400">{venueLabel}</span>
              )}
            </p>
          ) : null}
          <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link
              href="/events"
              className="font-medium text-amber-300 transition hover:text-amber-200"
            >
              Browse upcoming shows
            </Link>
            {archive.ticketmasterUrl ? (
              <a
                href={archive.ticketmasterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition hover:text-amber-200"
              >
                View on Ticketmaster
              </a>
            ) : null}
          </p>
        </div>
      </div>

      {archive.imageUrl ? (
        <div className="mx-auto mt-0 max-w-5xl px-4 pt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN */}
            <img
              src={archive.imageUrl}
              alt=""
              className="h-full w-full object-cover grayscale-[20%]"
              decoding="async"
            />
          </div>
        </div>
      ) : null}

      {venueEventsDeduped.length ? (
        <section className="mx-auto mt-14 max-w-5xl px-4" aria-labelledby="venue-events-heading">
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
      ) : null}

      <p className="mx-auto mt-14 max-w-3xl px-4 text-sm text-zinc-500">
        <Link href="/events" className="font-medium text-amber-300 transition hover:text-amber-200">
          ← All upcoming shows
        </Link>
      </p>
    </article>
  )
}
