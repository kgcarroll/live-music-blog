import {venueSlugFromName} from '@/lib/venueSlug'

type EventSlugInput = {
  name: string
  localDate: string | null
  startDateTime: string | null
}

/** URL slug from event name + date (e.g. "Artist Name" + 2026-05-24 → "artist-name-2026-05-24"). */
export function eventSlugFromEvent(event: EventSlugInput): string {
  const namePart = venueSlugFromName(event.name)
  const datePart = event.localDate?.trim() || event.startDateTime?.slice(0, 10)
  const base = datePart ? `${namePart}-${datePart}` : namePart
  return base.slice(0, 120) || 'event'
}

export function assignUniqueEventSlugs<T extends EventSlugInput & {slug?: string}>(
  events: T[],
): (T & {slug: string})[] {
  const used = new Set<string>()
  return events.map((event) => {
    const base = eventSlugFromEvent(event)
    let slug = base
    let n = 2
    while (used.has(slug)) {
      slug = `${base}-${n}`
      n += 1
    }
    used.add(slug)
    return {...event, slug}
  })
}
