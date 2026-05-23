'use server'

import {fetchScheduleEventsPage, type ScheduleEventsPageResult} from '@/lib/ticketmaster'

export async function loadMoreScheduleEvents(page: number): Promise<ScheduleEventsPageResult> {
  if (page < 0) return {events: [], hasMore: false}
  return fetchScheduleEventsPage(page)
}
