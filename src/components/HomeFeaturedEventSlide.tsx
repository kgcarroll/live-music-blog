import Link from 'next/link'

import type {ScheduleEvent} from '@/lib/ticketmaster'
import {eventHref} from '@/lib/paths'
import {formatScheduleEventWhen, formatScheduleVenue} from '@/lib/ticketmaster'

export function HomeFeaturedEventSlide({
  event,
  priority = false,
}: {
  event: ScheduleEvent
  priority?: boolean
}) {
  const href = eventHref(event.slug)
  const when = formatScheduleEventWhen(event)
  const venue = formatScheduleVenue(event)

  return (
    <article
      data-hero-href={href}
      className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm transition hover:border-amber-500/40"
    >
      <div className="relative w-full max-sm:h-[calc((100vw-2rem)*0.75+7rem)] sm:aspect-[8/3]">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN
          <img
            src={event.imageUrl}
            alt=""
            width={event.imageWidth ?? undefined}
            height={event.imageHeight ?? undefined}
            sizes="100vw"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            onDragStart={(dragEvent) => dragEvent.preventDefault()}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" aria-hidden />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/15"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-end p-5 pl-10 pr-10 max-sm:pb-12 sm:p-8 sm:pl-14 sm:pr-14 md:p-10 md:pl-16 md:pr-16">
          <p className="text-xs leading-snug">
            <span className="uppercase tracking-wide text-amber-300">Upcoming Concert</span>
            <span className="mx-1.5 text-zinc-600" aria-hidden="true">
              |
            </span>
            <time className="tabular-nums text-zinc-300" dateTime={when.dateTime}>
              {when.label}
            </time>
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            <Link
              href={href}
              className="rounded-sm text-zinc-50 outline-none transition hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/50 group-hover:text-amber-200"
            >
              {event.name}
            </Link>
          </h2>
          {venue ? (
            <p className="mt-3 max-w-2xl line-clamp-2 text-sm leading-relaxed text-zinc-300 sm:line-clamp-3 sm:text-base">
              {venue}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
