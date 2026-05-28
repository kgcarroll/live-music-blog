import {NextResponse} from 'next/server'

import {
  digestItemsToPortableText,
  generateNewsletterDigestWithOpenAI,
  NEWSLETTER_DIGEST_DAYS,
  NEWSLETTER_EVENTS_DAYS,
  NEWSLETTER_EVENTS_LIMIT,
  NEWSLETTER_MAX_PER_SECTION,
} from '@/lib/newsletterBodyGeneration'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      days?: number
      maxPerSection?: number
      includeUpcomingShows?: boolean
      eventsDays?: number
      eventsLimit?: number
    }

    const days = Math.max(1, Math.min(90, Number(body.days ?? NEWSLETTER_DIGEST_DAYS)))
    const maxPerSection = Math.max(
      1,
      Math.min(20, Number(body.maxPerSection ?? NEWSLETTER_MAX_PER_SECTION)),
    )
    const includeUpcomingShows = body.includeUpcomingShows === true
    const eventsDays = Math.max(1, Math.min(90, Number(body.eventsDays ?? NEWSLETTER_EVENTS_DAYS)))
    const eventsLimit = Math.max(
      1,
      Math.min(30, Number(body.eventsLimit ?? NEWSLETTER_EVENTS_LIMIT)),
    )

    const result = await generateNewsletterDigestWithOpenAI({
      days,
      maxPerSection,
      includeUpcomingShows,
      eventsDays,
      eventsLimit,
    })

    const blocks = digestItemsToPortableText({
      intro: result.intro,
      sections: result.sections,
      upcomingEvents: includeUpcomingShows ? result.upcomingEvents : [],
    })

    const sectionCounts = Object.fromEntries(
      result.sections.map((s) => [s.type, {inIssue: s.items.length, inWindow: s.totalInWindow}]),
    )

    return NextResponse.json({
      blocks,
      model: result.model,
      windowPostCount: result.windowPostCount,
      selectedPostCount: result.selectedPostCount,
      generatedItemCount: result.selectedPostCount,
      sectionCounts,
      upcomingEventCount: result.upcomingEvents.length,
      eventsError: result.eventsError ?? null,
      days,
      includeUpcomingShows,
    })
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Could not generate newsletter body.'},
      {status: 500},
    )
  }
}
