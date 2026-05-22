'use client'

import {useCallback, useEffect, useState, type ReactNode} from 'react'
import {ScheduleEventsFeed} from '@/components/ScheduleEventsFeed'
import {ScheduleViewToggle, type ScheduleViewMode} from '@/components/ScheduleViewToggle'
import type {ScheduleEvent} from '@/lib/ticketmaster'

const VIEW_STORAGE_KEY = 'schedule-view'

function readStoredView(): ScheduleViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function SchedulePageClient({
  children,
  initialEvents,
  initialHasMore,
  emptyMessage,
}: {
  children: ReactNode
  initialEvents: ScheduleEvent[]
  initialHasMore: boolean
  emptyMessage: string
}) {
  const [view, setView] = useState<ScheduleViewMode>('grid')

  useEffect(() => {
    setView(readStoredView())
  }, [])

  const setViewAndStore = useCallback((next: ScheduleViewMode) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-zinc-50">Schedule</h1>
        <ScheduleViewToggle view={view} onChange={setViewAndStore} />
      </div>
      {children}
      <ScheduleEventsFeed
        view={view}
        initialEvents={initialEvents}
        initialHasMore={initialHasMore}
        emptyMessage={emptyMessage}
      />
    </div>
  )
}
