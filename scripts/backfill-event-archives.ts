/**
 * Backfill Sanity eventArchive docs for slugs no longer in the live feed.
 * Usage: node --env-file=.env.local --import tsx scripts/backfill-event-archives.ts [slug...]
 */
import {assignUniqueEventSlugs, eventSlugFromEvent} from '../src/lib/eventSlug'
import {upsertEventArchiveDocuments} from '../src/lib/eventArchive'
import {SCHEDULE_DMA_ID_DEFAULT} from '../src/lib/schedule'
import type {ScheduleEvent} from '../src/lib/ticketmaster'
import {venueSlugFromName} from '../src/lib/venueSlug'

const DEFAULT_SLUGS = [
  'celebrating-celine-musical-tribute-to-celine-dion-2026-05-28',
  'celebrating-celine-ticket-hotel-deals-2026-05-28',
]

type RawEvent = {
  id?: string
  name?: string
  url?: string
  images?: {url?: string}[]
  dates?: {
    start?: {dateTime?: string; localDate?: string; localTime?: string}
    timezone?: string
  }
  _embedded?: {
    venues?: {
      id?: string
      name?: string
      city?: {name?: string}
      state?: {stateCode?: string}
    }[]
  }
}

function localDateFromSlug(slug: string): string | null {
  const match = slug.match(/(\d{4}-\d{2}-\d{2})$/)
  return match?.[1] ?? null
}

function normalizeRaw(raw: RawEvent): Omit<ScheduleEvent, 'slug'> | null {
  const id = raw.id?.trim()
  const name = raw.name?.trim()
  const url = raw.url?.trim()
  if (!id || !name || !url) return null

  const start = raw.dates?.start
  const venue = raw._embedded?.venues?.[0]
  const imageUrl = raw.images?.find((img) => img.url)?.url?.trim() || null

  return {
    id,
    name,
    url,
    imageUrl: imageUrl ? imageUrl.replace(/^http:\/\//i, 'https://') : null,
    imageWidth: null,
    imageHeight: null,
    startDateTime: start?.dateTime ?? null,
    localDate: start?.localDate ?? null,
    localTime: start?.localTime ?? null,
    timezone: raw.dates?.timezone ?? null,
    venueId: venue?.id?.trim() || null,
    venueName: venue?.name?.trim() || null,
    venueCity: venue?.city?.name?.trim() || null,
    venueState: venue?.state?.stateCode?.trim() || null,
  }
}

async function fetchEventsByKeyword(keyword: string): Promise<RawEvent[]> {
  const apikey = process.env.TICKETMASTER_API_KEY?.trim()
  if (!apikey) throw new Error('TICKETMASTER_API_KEY is not set')

  const dmaId = process.env.TICKETMASTER_DMA_ID?.trim() || SCHEDULE_DMA_ID_DEFAULT
  const collected: RawEvent[] = []

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      apikey,
      classificationName: 'music',
      countryCode: 'US',
      locale: 'en-us',
      sort: 'date,asc',
      size: '200',
      page: String(page),
      dmaId,
      keyword,
    })

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      {cache: 'no-store'},
    )

    if (!response.ok) {
      throw new Error(`Ticketmaster API ${response.status} for keyword=${keyword}`)
    }

    const json = (await response.json()) as {_embedded?: {events?: RawEvent[]}; page?: {totalPages?: number}}
    const events = json._embedded?.events ?? []
    collected.push(...events)

    const totalPages = json.page?.totalPages ?? 0
    if (!events.length || page >= totalPages - 1) break
  }

  return collected
}

function keywordsForSlugs(slugs: string[]): string[] {
  const keywords = new Set<string>()
  for (const slug of slugs) {
    const date = localDateFromSlug(slug)
    const namePart = date ? slug.slice(0, -(date.length + 1)) : slug
    const words = namePart.split('-').filter(Boolean)
    if (words.length >= 2) {
      keywords.add(
        words
          .slice(0, Math.min(3, words.length))
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      )
    }
  }
  keywords.add('Celebrating Celine')
  return [...keywords]
}

async function discoverEventsForSlugs(targetSlugs: string[]): Promise<ScheduleEvent[]> {
  const dates = new Set(targetSlugs.map(localDateFromSlug).filter(Boolean) as string[])
  const byId = new Map<string, Omit<ScheduleEvent, 'slug'>>()

  for (const keyword of keywordsForSlugs(targetSlugs)) {
    const rawEvents = await fetchEventsByKeyword(keyword)
    for (const raw of rawEvents) {
      const event = normalizeRaw(raw)
      if (!event || byId.has(event.id)) continue
      if (dates.size && event.localDate && !dates.has(event.localDate)) continue
      byId.set(event.id, event)
    }
  }

  const withSlugs = assignUniqueEventSlugs([...byId.values()])
  const targetSet = new Set(targetSlugs)
  return withSlugs.filter((event) => targetSet.has(event.slug))
}

async function main() {
  const targetSlugs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SLUGS
  console.log('Target slugs:', targetSlugs.join(', '))

  const matched = await discoverEventsForSlugs(targetSlugs)
  const foundSlugs = new Set(matched.map((event) => event.slug))
  const missing = targetSlugs.filter((slug) => !foundSlugs.has(slug))

  if (missing.length) {
    console.warn('No Ticketmaster match for:', missing.join(', '))
    console.warn('Known slugs from API on same date:')
    const dates = [...new Set(targetSlugs.map(localDateFromSlug).filter(Boolean) as string[])]
    const apikey = process.env.TICKETMASTER_API_KEY?.trim()
    if (apikey) {
      const raw = await fetchEventsByKeyword('Celebrating Celine')
      const cores = raw.map(normalizeRaw).filter(Boolean) as Omit<ScheduleEvent, 'slug'>[]
      for (const core of assignUniqueEventSlugs(cores)) {
        console.warn(`  - ${core.slug} (${core.name})`)
      }
    }
  }

  if (!matched.length) {
    throw new Error('No events matched; nothing written to Sanity')
  }

  const venueSlugById = new Map<string, string>()
  for (const event of matched) {
    if (event.venueId && event.venueName) {
      venueSlugById.set(event.venueId, venueSlugFromName(event.venueName))
    }
  }

  const written = await upsertEventArchiveDocuments(matched, venueSlugById)
  console.log(`Wrote ${written} event archive(s):`)
  for (const event of matched) {
    console.log(`  ${event.slug}`)
    console.log(`    ${event.name} · ${eventSlugFromEvent(event)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
