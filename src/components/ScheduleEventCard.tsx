import {formatScheduleEventWhen, formatScheduleVenue, type ScheduleEvent} from '@/lib/ticketmaster'

export function ScheduleEventCardSkeleton() {
  return (
    <article
      className="flex h-full min-h-0 w-full min-w-0 animate-pulse flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] w-full shrink-0 bg-zinc-800/80" />
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="h-3 w-28 rounded bg-zinc-700/80" />
        <div className="h-4 w-11/12 rounded bg-zinc-700/80" />
        <div className="h-4 w-2/3 rounded bg-zinc-700/60" />
        <div className="mt-auto h-3 w-20 rounded bg-zinc-800" />
      </div>
    </article>
  )
}

export function ScheduleEventCard({event}: {event: ScheduleEvent}) {
  const when = formatScheduleEventWhen(event)
  const venue = formatScheduleVenue(event)

  return (
    <article className="group flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm transition hover:border-amber-500/40">
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-800"
      >
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN; outside Sanity image loader
          <img
            src={event.imageUrl}
            alt=""
            width={event.imageWidth ?? undefined}
            height={event.imageHeight ?? undefined}
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, min(400px, 33vw)"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">No image</div>
        )}
      </a>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <p className="shrink-0 text-xs leading-snug">
          <span className="uppercase tracking-wide text-amber-300">Concert</span>
          <span className="mx-1.5 text-zinc-600" aria-hidden="true">
            |
          </span>
          <time className="tabular-nums text-zinc-400" dateTime={when.dateTime}>
            {when.label}
          </time>
        </p>
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-50 sm:text-base">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm outline-none transition-colors hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            {event.name}
          </a>
        </h2>
        {venue ? <p className="line-clamp-2 text-xs leading-snug text-zinc-500">{venue}</p> : null}
        <p className="mt-auto shrink-0 pt-1">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            Tickets
          </a>
          <span className="sr-only"> (opens Ticketmaster in a new tab)</span>
        </p>
      </div>
    </article>
  )
}
