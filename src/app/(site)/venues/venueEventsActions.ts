'use server'

import {fetchVenueEventsPage, type VenueEventsResult} from '@/lib/ticketmaster'

export async function loadMoreVenueEvents(
  venueId: string,
  page: number,
): Promise<VenueEventsResult> {
  if (page < 0) return {events: [], hasMore: false}
  return fetchVenueEventsPage(venueId, page)
}
