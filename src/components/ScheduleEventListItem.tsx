import Link from 'next/link'

import {formatScheduleEventWhen, formatScheduleVenue, type ScheduleEvent} from '@/lib/ticketmaster'
import {eventHref} from '@/lib/paths'

export function ScheduleEventListSkeleton() {
  return (
    <li
      className="grid animate-pulse grid-cols-1 gap-2 border-b border-zinc-800/90 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] sm:items-center sm:gap-4"
      aria-hidden="true"
    >
      <div className="h-4 w-4/5 rounded bg-zinc-700/80" />
      <div className="h-3 w-32 rounded bg-zinc-700/60" />
      <div className="h-3 w-40 rounded bg-zinc-800" />
      <div className="h-3 w-14 rounded bg-amber-300/20" />
    </li>
  )
}

export function ScheduleEventListItem({event}: {event: ScheduleEvent}) {
  const when = formatScheduleEventWhen(event)
  const venue = formatScheduleVenue(event)
  const href = eventHref(event.slug)

  return (
    <li className="grid grid-cols-1 gap-1 border-b border-zinc-800/90 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] sm:items-center sm:gap-4">
      <h2 className="text-sm font-semibold leading-snug text-zinc-50 sm:text-base">
        <Link
          href={href}
          className="rounded-sm outline-none transition-colors hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          {event.name}
        </Link>
      </h2>
      <time
        className="text-xs tabular-nums text-zinc-400 sm:text-sm"
        dateTime={when.dateTime}
      >
        {when.label}
      </time>
      <p className="text-xs text-zinc-500 sm:text-sm">{venue ?? '—'}</p>
      <p className="sm:text-right">
        <Link
          href={href}
          className="text-xs font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          Details
        </Link>
      </p>
    </li>
  )
}
