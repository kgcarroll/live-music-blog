import {EventArticleContent} from '@/components/EventArticleContent'
import type {EventDetail, ScheduleEvent} from '@/lib/ticketmaster'

export function PastEventContent({
  detail,
  venueSlug,
  venueEvents,
}: {
  detail: EventDetail
  venueSlug: string | null
  venueEvents: ScheduleEvent[]
}) {
  const venueEventsDeduped = venueEvents.filter((item) => item.id !== detail.id)
  const relatedSectionTitle = detail.venueName
    ? `Upcoming shows at ${detail.venueName}`
    : 'Upcoming shows at this venue'

  return (
    <EventArticleContent
      detail={detail}
      venueSlug={venueSlug}
      relatedEvents={venueEventsDeduped}
      attractions={detail.attractions}
      isPast
      relatedSectionTitle={relatedSectionTitle}
    />
  )
}
