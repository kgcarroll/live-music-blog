import {formatScheduleEventWhen, formatScheduleVenue, type ScheduleEvent} from '@/lib/ticketmaster'

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

  return (
    <li className="grid grid-cols-1 gap-1 border-b border-zinc-800/90 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] sm:items-center sm:gap-4">
      <h2 className="text-sm font-semibold leading-snug text-zinc-50 sm:text-base">
        {event.name}
      </h2>
      <time
        className="text-xs tabular-nums text-zinc-400 sm:text-sm"
        dateTime={when.dateTime}
      >
        {when.label}
      </time>
      <p className="text-xs text-zinc-500 sm:text-sm">{venue ?? '—'}</p>
      <p className="sm:text-right">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          Tickets
        </a>
        <span className="sr-only"> for {event.name} (opens Ticketmaster in a new tab)</span>
      </p>
    </li>
  )
}
