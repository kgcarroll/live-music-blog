import Link from 'next/link'

import {ScheduleEventCard} from '@/components/ScheduleEventCard'
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
}: {
  detail: EventDetail
  venueSlug: string | null
  relatedEvents: ScheduleEvent[]
}) {
  const when = formatScheduleEventWhen(detail)
  const venueLabel = formatScheduleVenue(detail)

  return (
    <article className="pb-16">
      <div className="bg-zinc-950/80">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-xs leading-snug text-zinc-400">
            <span className="uppercase tracking-wide text-amber-300">Concert</span>
            <span className="mx-1.5 text-zinc-600" aria-hidden="true">
              |
            </span>
            <time className="tabular-nums text-zinc-400" dateTime={when.dateTime}>
              {when.label}
            </time>
            {detail.priceSummary ? (
              <>
                <span className="mx-1.5 text-zinc-600" aria-hidden="true">
                  |
                </span>
                <span className="tabular-nums text-zinc-400">From {detail.priceSummary}</span>
              </>
            ) : null}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
            {detail.name}
          </h1>
          {venueLabel ? (
            <p className="mt-3 text-sm text-zinc-400">
              At{' '}
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
          <p className="mt-6">
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              Get tickets on Ticketmaster
            </a>
          </p>
        </div>
      </div>

      {detail.imageUrl ? (
        <div className="mx-auto mt-0 max-w-5xl px-4 pt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN */}
            <img
              src={detail.imageUrl}
              alt=""
              width={detail.imageWidth ?? undefined}
              height={detail.imageHeight ?? undefined}
              sizes="(max-width: 1024px) 100vw, 896px"
              className="h-full w-full object-cover"
              decoding="async"
            />
          </div>
        </div>
      ) : null}

      {detail.info ? (
        <p className="mx-auto mt-10 max-w-3xl px-4 text-lg leading-relaxed text-zinc-300 whitespace-pre-line">
          {detail.info}
        </p>
      ) : null}

      {detail.pleaseNote ? (
        <div className="mx-auto mt-10 max-w-3xl px-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Please note</h2>
          <p className="mt-3 text-lg leading-relaxed text-zinc-300 whitespace-pre-line">
            {detail.pleaseNote}
          </p>
        </div>
      ) : null}

      <p className="mx-auto mt-10 max-w-3xl px-4 text-sm text-zinc-500">
        <Link href="/events" className="font-medium text-amber-300 transition hover:text-amber-200">
          ← All upcoming shows
        </Link>
      </p>

      {relatedEvents.length ? (
        <section className="mx-auto mt-14 max-w-5xl px-4" aria-labelledby="related-events-heading">
          <h2 id="related-events-heading" className="text-2xl font-semibold tracking-tight text-zinc-50">
            Related events
          </h2>
          <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
            {relatedEvents.map((event) => (
              <ScheduleEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}
