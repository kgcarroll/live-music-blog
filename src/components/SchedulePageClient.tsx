'use client'

import {useState, type ReactNode} from 'react'
import {ScheduleEventsFeed} from '@/components/ScheduleEventsFeed'
import {ScheduleViewToggle, type ScheduleViewMode} from '@/components/ScheduleViewToggle'
import type {ScheduleEvent} from '@/lib/ticketmaster'

export function SchedulePageClient({
  children,
  initialEvents,
  initialHasMore,
  initialPage,
  emptyMessage,
}: {
  children: ReactNode
  initialEvents: ScheduleEvent[]
  initialHasMore: boolean
  initialPage: number
  emptyMessage: string
}) {
  const [view, setView] = useState<ScheduleViewMode>('grid')

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-zinc-50">Events</h1>
        <ScheduleViewToggle view={view} onChange={setView} ariaLabel="Events layout" />
      </div>
      {children}
      <ScheduleEventsFeed
        view={view}
        initialEvents={initialEvents}
        initialHasMore={initialHasMore}
        initialPage={initialPage}
        emptyMessage={emptyMessage}
      />
    </div>
  )
}
