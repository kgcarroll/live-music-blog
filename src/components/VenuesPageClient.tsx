'use client'

import {useCallback, useEffect, useState, type ReactNode} from 'react'

import {ScheduleViewToggle, type ScheduleViewMode} from '@/components/ScheduleViewToggle'
import {VenuesMapLazy} from '@/components/VenuesMapLazy'
import {VenuesVenuesFeed} from '@/components/VenuesVenuesFeed'
import type {VenueMapPin} from '@/lib/ticketmaster'

const VIEW_STORAGE_KEY = 'venues-view'

function readStoredView(): ScheduleViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function VenuesPageClient({
  children,
  venues,
  emptyMessage,
}: {
  children: ReactNode
  venues: VenueMapPin[]
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

  const hasVenues = venues.length > 0

  return (
    <div>
      <div>
        {hasVenues ? (
          <VenuesMapLazy venues={venues} />
        ) : (
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        )}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-zinc-50">Venues</h1>
        {hasVenues ? (
          <ScheduleViewToggle
            view={view}
            onChange={setViewAndStore}
            ariaLabel="Venues layout"
          />
        ) : null}
      </div>
      {children}
      {hasVenues ? (
        <VenuesVenuesFeed view={view} venues={venues} emptyMessage={emptyMessage} />
      ) : null}
    </div>
  )
}
