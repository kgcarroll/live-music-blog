import {getEventIndex, formatScheduleEventWhen, formatScheduleVenue} from '@/lib/ticketmaster'

export type StudioCarouselEventOption = {
  slug: string
  name: string
  when: string
  venue: string | null
  imageUrl: string
}

export async function listStudioCarouselEventOptions(): Promise<
  {events: StudioCarouselEventOption[]} | {error: 'not_configured' | 'api_error'}
> {
  const index = await getEventIndex()
  if (index.error) return {error: index.error}

  const events = index.events
    .filter((event) => event.imageUrl)
    .map((event) => ({
      slug: event.slug,
      name: event.name,
      when: formatScheduleEventWhen(event).label,
      venue: formatScheduleVenue(event),
      imageUrl: event.imageUrl!,
    }))

  return {events}
}
