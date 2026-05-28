import {editorialHref, type EditorialType} from '@/lib/paths'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {
  formatScheduleEventWhen,
  formatScheduleVenue,
  getEventIndex,
  type ScheduleEvent,
} from '@/lib/ticketmaster'
import {client} from '@/sanity/lib/client'
import {NEWSLETTER_EDITORIAL_FEED} from '@/sanity/lib/queries'

/** Biweekly digest window (days). */
export const NEWSLETTER_DIGEST_DAYS = 14

/** Max articles per editorial section in the generated issue. */
export const NEWSLETTER_MAX_PER_SECTION = 5

/** Upcoming shows window and count for the optional events block. */
export const NEWSLETTER_EVENTS_DAYS = 14
export const NEWSLETTER_EVENTS_LIMIT = 12

const SECTION_ORDER: EditorialType[] = ['news', 'review', 'interview']

const SECTION_LABEL: Record<EditorialType, string> = {
  news: 'News',
  review: 'Reviews',
  interview: 'Interviews',
}

const SECTION_HUB_PATH: Record<EditorialType, string> = {
  news: '/news',
  review: '/reviews',
  interview: '/interviews',
}

const SECTION_HUB_LINK_TEXT: Record<EditorialType, string> = {
  news: 'See all News',
  review: 'See all Reviews',
  interview: 'See all Interviews',
}

type OpenAIChatResponse = {
  choices?: {message?: {content?: string}}[]
  error?: {message?: string}
}

export type NewsletterEditorialPost = {
  _type: string
  title?: string | null
  slug?: string | null
  publishedAt?: string | null
  excerpt?: string | null
  seoDescription?: string | null
  body?: unknown
}

export type NewsletterDigestItem = {
  headline: string
  excerpt: string
  url: string
}

type SectionDraftItem = {
  headline: string
  url: string
  description: string | null
  publishedAt: string | null
}

export type NewsletterDigestSection = {
  type: EditorialType
  title: string
  hubUrl: string
  hubLinkText: string
  items: NewsletterDigestItem[]
  /** Total published in window before cap (for Studio status). */
  totalInWindow: number
}

type SectionDraft = Omit<NewsletterDigestSection, 'items'> & {items: SectionDraftItem[]}

export type NewsletterDigestIntro = {
  paragraphs: string[]
}

export type NewsletterEmailMeta = {
  emailSubject: string
  previewText: string
}

export type NewsletterUpcomingEvent = {
  name: string
  when: string
  venue: string | null
  url: string
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const slice = trimmed.slice(start, end + 1)
      return JSON.parse(slice)
    }
    throw new Error('OpenAI returned invalid JSON.')
  }
}

function clampText(s: string, max = 280) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function normalizeEmailSubject(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  const out = raw || fallback
  return clampText(out, 78)
}

function normalizePreviewText(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  const out = raw || fallback
  return clampText(out, 120)
}

function isEditorialType(type: string): type is EditorialType {
  return type === 'news' || type === 'review' || type === 'interview'
}

function postUrl(post: NewsletterEditorialPost): string | null {
  const slug = post.slug?.trim()
  if (!slug || !isEditorialType(post._type)) return null
  return absoluteSiteUrl(editorialHref(post._type, slug))
}

function postDescription(post: NewsletterEditorialPost): string | null {
  const excerpt = post.excerpt?.trim()
  if (excerpt) return clampText(excerpt, 600)
  const seo = post.seoDescription?.trim()
  if (seo) return clampText(seo, 600)
  const body = plainTextFromPortableText(post.body as never)
  return body ? clampText(body, 600) : null
}

function sinceIso(days: number): string {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(cutoff).toISOString()
}

export async function fetchEditorialPostsForNewsletter(
  days: number,
): Promise<NewsletterEditorialPost[]> {
  const posts = await client.fetch<NewsletterEditorialPost[]>(
    NEWSLETTER_EDITORIAL_FEED,
    {since: sinceIso(days)},
    {useCdn: false},
  )
  return Array.isArray(posts) ? posts.filter((p) => p?.title?.trim() && postUrl(p)) : []
}

function groupPostsForDigest(posts: NewsletterEditorialPost[], maxPerSection: number): SectionDraft[] {
  const byType: Record<EditorialType, NewsletterEditorialPost[]> = {
    news: [],
    review: [],
    interview: [],
  }

  for (const post of posts) {
    if (!isEditorialType(post._type)) continue
    byType[post._type].push(post)
  }

  return SECTION_ORDER.map((type) => {
    const inWindow = byType[type]
    const selected = inWindow.slice(0, maxPerSection)
    return {
      type,
      title: SECTION_LABEL[type],
      hubUrl: absoluteSiteUrl(SECTION_HUB_PATH[type]),
      hubLinkText: SECTION_HUB_LINK_TEXT[type],
      totalInWindow: inWindow.length,
      items: selected.map((post) => ({
        headline: post.title!.trim(),
        url: postUrl(post)!,
        description: postDescription(post),
        publishedAt: post.publishedAt ?? null,
      })),
    }
  }).filter((section) => section.items.length > 0)
}

type DigestPayloadItem = {
  title: string
  url: string
  section: EditorialType
  description: string | null
  publishedAt: string | null
}

const NEWSLETTER_EVENTS_TIMEZONE = 'America/New_York'

function eventSortMs(event: ScheduleEvent): number | null {
  if (event.startDateTime) {
    const time = Date.parse(event.startDateTime)
    if (!Number.isNaN(time)) return time
  }
  if (event.localDate) {
    const time = Date.parse(`${event.localDate}T${event.localTime ?? '00:00:00'}`)
    if (!Number.isNaN(time)) return time
  }
  return null
}

/** Calendar day for grouping (Philly), preferring Ticketmaster localDate. */
function eventCalendarDayKey(event: ScheduleEvent): string | null {
  const local = event.localDate?.trim().slice(0, 10)
  if (local && /^\d{4}-\d{2}-\d{2}$/.test(local)) return local

  const ms = eventSortMs(event)
  if (ms == null) return null
  return new Date(ms).toLocaleDateString('en-CA', {timeZone: NEWSLETTER_EVENTS_TIMEZONE})
}

function todayCalendarDayKey(timeZone = NEWSLETTER_EVENTS_TIMEZONE): string {
  return new Date().toLocaleDateString('en-CA', {timeZone})
}

function addCalendarDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map((part) => Number(part))
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

/**
 * Spread picks across the next N calendar days (one show per day when possible)
 * so the newsletter is not dominated by a single busy weekend.
 */
export function pickSpreadUpcomingEvents(
  events: ScheduleEvent[],
  options: {limit: number; spreadDays: number; nowMs?: number},
): ScheduleEvent[] {
  const nowMs = options.nowMs ?? Date.now()
  const limit = Math.max(1, options.limit)
  const spreadDays = Math.max(1, options.spreadDays)

  const inWindow = events
    .filter((event) => {
      const ms = eventSortMs(event)
      return ms != null && ms >= nowMs
    })
    .sort((a, b) => (eventSortMs(a) ?? 0) - (eventSortMs(b) ?? 0))

  const byDay = new Map<string, ScheduleEvent[]>()
  for (const event of inWindow) {
    const day = eventCalendarDayKey(event)
    if (!day) continue
    const list = byDay.get(day)
    if (list) list.push(event)
    else byDay.set(day, [event])
  }

  const picked: ScheduleEvent[] = []
  const pickedIds = new Set<string>()
  const startDay = todayCalendarDayKey()

  for (let offset = 0; offset < spreadDays && picked.length < limit; offset++) {
    const dayKey = addCalendarDays(startDay, offset)
    const dayEvents = byDay.get(dayKey)
    if (!dayEvents?.length) continue
    const event = dayEvents.find((e) => !pickedIds.has(e.id))
    if (!event) continue
    picked.push(event)
    pickedIds.add(event.id)
  }

  if (picked.length < limit) {
    for (const event of inWindow) {
      if (picked.length >= limit) break
      if (pickedIds.has(event.id)) continue
      picked.push(event)
      pickedIds.add(event.id)
    }
  }

  return picked.sort((a, b) => (eventSortMs(a) ?? 0) - (eventSortMs(b) ?? 0))
}

export async function fetchNewsletterUpcomingEvents(options: {
  days: number
  limit: number
}): Promise<{events: NewsletterUpcomingEvent[]; error?: 'not_configured' | 'api_error'}> {
  const index = await getEventIndex()
  if (index.error) return {events: [], error: index.error}

  const now = Date.now()
  const end = now + options.days * 24 * 60 * 60 * 1000

  const inWindow = index.events.filter((event) => {
    const ms = eventSortMs(event)
    return ms != null && ms >= now && ms <= end
  })

  const spreadDays = Math.min(options.limit, options.days)
  const upcoming = pickSpreadUpcomingEvents(inWindow, {
    limit: options.limit,
    spreadDays,
    nowMs: now,
  })

  return {
    events: upcoming.map((event) => ({
      name: event.name,
      when: formatScheduleEventWhen(event).label,
      venue: formatScheduleVenue(event),
      url: absoluteSiteUrl(`/events/${event.slug}`),
    })),
  }
}

export async function generateNewsletterDigestWithOpenAI(options: {
  days: number
  maxPerSection: number
  includeUpcomingShows: boolean
  eventsDays: number
  eventsLimit: number
}): Promise<{
  email: NewsletterEmailMeta
  intro: NewsletterDigestIntro
  sections: NewsletterDigestSection[]
  upcomingEvents: NewsletterUpcomingEvent[]
  model: string
  totalPostCount: number
  windowPostCount: number
  selectedPostCount: number
  eventsError?: 'not_configured' | 'api_error'
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.')

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const allPosts = await fetchEditorialPostsForNewsletter(options.days)
  const windowPostCount = allPosts.length

  const sectionDrafts = groupPostsForDigest(allPosts, options.maxPerSection)
  const payload: DigestPayloadItem[] = sectionDrafts.flatMap((section) =>
    section.items.map((item) => ({
      title: item.headline,
      url: item.url,
      section: section.type,
      description: item.description,
      publishedAt: item.publishedAt,
    })),
  )

  const selectedPostCount = payload.length
  if (!selectedPostCount) {
    throw new Error(`No published articles found in the last ${options.days} days.`)
  }

  let upcomingEvents: NewsletterUpcomingEvent[] = []
  let eventsError: 'not_configured' | 'api_error' | undefined
  if (options.includeUpcomingShows) {
    const eventsResult = await fetchNewsletterUpcomingEvents({
      days: options.eventsDays,
      limit: options.eventsLimit,
    })
    upcomingEvents = eventsResult.events
    eventsError = eventsResult.error
  }

  const system =
    'You write biweekly newsletter blurbs from a list of recent articles grouped by section (news, reviews, interviews). ' +
    'Return ONLY valid JSON: {"emailSubject": string, "previewText": string, "intro":{"paragraphs":[string]},"items":[{headline, excerpt, url}]}. ' +
    'emailSubject must be specific to the actual articles in this digest. Mention 1-3 major artists, bands, tours, albums, or news events featured in the articles. Never use generic subjects like "Latest Music News", "Music Updates", "New Reviews", or "Weekly Digest". The subject should read like a real music publication email and clearly reflect the biggest stories in the input content. Keep it under 80 characters. ' +
    'previewText must also reference specific content from the digest. Mention notable artists, tours, albums, anniversaries, awards, or headlines covered in the articles. Never write vague summaries like "Catch up on the latest music news." Keep it conversational and under 120 characters. ' +
    'intro.paragraphs must be 1-2 short paragraphs, plain text, friendly, and summarize the biggest themes and stories from this two-week digest. Reference actual artists, tours, releases, or events from the provided articles when relevant. Avoid generic wording. ' +
    'intro.paragraphs should not use AI-sounding phrases, filler text, corporate language, or exaggerated hype. Avoid phrases like "dive into", "packed with", "exciting roundup", "must-read", "latest happenings", or "ever-evolving music scene". ' +
    'Rules: headline should be the original title or a light edit (no clickbait). ' +
    'excerpt must be 2-3 sentences, plain text, conversational, and grounded in the article content. Summarize the actual story instead of speaking broadly about music culture. Avoid flowery or AI-sounding wording. ' +
    'url must match an input url exactly. Do not invent content. Include every input article exactly once. ' +
    'Prioritize specificity over generality in every field. If the digest includes recognizable artists, venues, tours, albums, anniversaries, awards, or regional music stories, reference them directly.'

  const user = JSON.stringify({
    digestDays: options.days,
    items: payload.map((p) => ({
      section: p.section,
      title: p.title,
      url: p.url,
      description: p.description,
      publishedAt: p.publishedAt,
    })),
  })

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: {type: 'json_object'},
      messages: [
        {role: 'system', content: system},
        {role: 'user', content: user},
      ],
      temperature: 0.2,
    }),
  })

  const data = (await openaiResponse.json().catch(() => ({}))) as OpenAIChatResponse
  if (!openaiResponse.ok)
    throw new Error(data.error?.message || `OpenAI request failed (${openaiResponse.status})`)

  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned empty newsletter JSON.')

  const parsed = parseJsonObject(raw) as {
    emailSubject?: unknown
    previewText?: unknown
    intro?: unknown
    items?: unknown
  } | null
  const introParagraphs = Array.isArray((parsed as {intro?: {paragraphs?: unknown}})?.intro?.paragraphs)
    ? ((parsed as {intro: {paragraphs: unknown[]}}).intro.paragraphs as unknown[])
        .map((p: unknown) => String(p ?? '').trim())
        .filter(Boolean)
        .slice(0, 2)
    : []

  const list = Array.isArray(parsed?.items) ? (parsed.items as unknown[]) : null
  if (!list) throw new Error('OpenAI returned invalid newsletter JSON shape.')

  const generatedByUrl = new Map<string, NewsletterDigestItem>()
  for (const x of list) {
    const headline = String((x as {headline?: unknown})?.headline ?? '').trim()
    const excerpt = String((x as {excerpt?: unknown})?.excerpt ?? '').trim()
    const url = String((x as {url?: unknown})?.url ?? '').trim()
    if (headline && excerpt && url) generatedByUrl.set(url, {headline, excerpt, url})
  }

  const allowedUrls = new Set(payload.map((p) => p.url))
  const sections: NewsletterDigestSection[] = sectionDrafts.map((section) => ({
    type: section.type,
    title: section.title,
    hubUrl: section.hubUrl,
    hubLinkText: section.hubLinkText,
    totalInWindow: section.totalInWindow,
    items: section.items
      .map((draft) => {
        const generated = generatedByUrl.get(draft.url)
        if (generated && allowedUrls.has(generated.url)) return generated
        return {
          headline: draft.headline,
          excerpt:
            draft.description?.trim() || 'Read the full story on Philadelphia Music Live.',
          url: draft.url,
        }
      })
      .filter((item) => item.headline && item.url),
  }))

  const generatedCount = sections.reduce((n, s) => n + s.items.length, 0)
  if (!generatedCount) throw new Error('OpenAI returned no usable newsletter items.')

  const fallbackSubject = `Philadelphia Music Live — last ${options.days} days`
  const fallbackPreview = introParagraphs[0]?.trim() || `The latest from Philadelphia Music Live (last ${options.days} days).`

  return {
    email: {
      emailSubject: normalizeEmailSubject(parsed?.emailSubject, fallbackSubject),
      previewText: normalizePreviewText(parsed?.previewText, fallbackPreview),
    },
    intro: {
      paragraphs: introParagraphs.length
        ? introParagraphs
        : [`Here is what we published over the last ${options.days} days.`],
    },
    sections,
    upcomingEvents,
    model,
    totalPostCount: windowPostCount,
    windowPostCount,
    selectedPostCount: generatedCount,
    eventsError,
  }
}

function linkBlock(mkKey: () => string, text: string, href: string) {
  const linkKey = mkKey()
  return {
    _type: 'block' as const,
    _key: mkKey(),
    style: 'normal' as const,
    markDefs: [{_type: 'link' as const, _key: linkKey, href}],
    children: [{_type: 'span' as const, _key: mkKey(), text, marks: [linkKey]}],
  }
}

export function digestItemsToPortableText(input: {
  intro: NewsletterDigestIntro
  sections: NewsletterDigestSection[]
  upcomingEvents?: NewsletterUpcomingEvent[]
}) {
  const mkKey = () => Math.random().toString(16).slice(2, 10)
  const {intro, sections, upcomingEvents = []} = input

  const sectionBlocks = sections.flatMap((section) => {
    const header = {
      _type: 'block' as const,
      _key: mkKey(),
      style: 'h2' as const,
      markDefs: [],
      children: [{_type: 'span' as const, _key: mkKey(), text: section.title, marks: []}],
    }

    const articleBlocks = section.items.flatMap((it) => {
      const linkKey = mkKey()
      return [
        {
          _type: 'block' as const,
          _key: mkKey(),
          style: 'h3' as const,
          markDefs: [],
          children: [{_type: 'span' as const, _key: mkKey(), text: it.headline, marks: []}],
        },
        {
          _type: 'block' as const,
          _key: mkKey(),
          style: 'normal' as const,
          markDefs: [],
          children: [{_type: 'span' as const, _key: mkKey(), text: it.excerpt, marks: []}],
        },
        {
          _type: 'block' as const,
          _key: mkKey(),
          style: 'normal' as const,
          markDefs: [{_type: 'link' as const, _key: linkKey, href: it.url}],
          children: [{_type: 'span' as const, _key: mkKey(), text: 'Read more', marks: [linkKey]}],
        },
      ]
    })

    const hubLink = linkBlock(mkKey, section.hubLinkText, section.hubUrl)

    return [header, ...articleBlocks, hubLink]
  })

  const eventsBlocks =
    upcomingEvents.length > 0
      ? [
          {
            _type: 'block' as const,
            _key: mkKey(),
            style: 'h2' as const,
            markDefs: [],
            children: [
              {_type: 'span' as const, _key: mkKey(), text: 'Coming up in Philadelphia', marks: []},
            ],
          },
          ...upcomingEvents.flatMap((event) => {
            const linkKey = mkKey()
            const venueSuffix = event.venue ? ` at ${event.venue}` : ''
            return [
              {
                _type: 'block' as const,
                _key: mkKey(),
                style: 'normal' as const,
                markDefs: [{_type: 'link' as const, _key: linkKey, href: event.url}],
                children: [
                  {_type: 'span' as const, _key: mkKey(), text: `${event.when} — `, marks: []},
                  {_type: 'span' as const, _key: mkKey(), text: event.name, marks: [linkKey]},
                  {_type: 'span' as const, _key: mkKey(), text: venueSuffix, marks: []},
                ],
              },
            ]
          }),
          linkBlock(mkKey, 'See all concerts', absoluteSiteUrl('/events')),
        ]
      : []

  return [
    ...(intro.paragraphs ?? []).map((p) => ({
      _type: 'block' as const,
      _key: mkKey(),
      style: 'normal' as const,
      markDefs: [],
      children: [{_type: 'span' as const, _key: mkKey(), text: p, marks: []}],
    })),
    ...sectionBlocks,
    ...eventsBlocks,
    {
      _type: 'block' as const,
      _key: mkKey(),
      style: 'normal' as const,
      markDefs: [],
      children: [
        {
          _type: 'span' as const,
          _key: mkKey(),
          text: 'Thank you for reading Philadelphia Music Live.',
          marks: [],
        },
      ],
    },
    {
      _type: 'block' as const,
      _key: mkKey(),
      style: 'normal' as const,
      markDefs: [],
      children: [
        {
          _type: 'span' as const,
          _key: mkKey(),
          text:
            'If you enjoy our coverage of concerts, new music, and artist news from Philadelphia and beyond, consider sharing our stories with fellow music fans and following us on social media for daily updates.',
          marks: [],
        },
      ],
    },
    {
      _type: 'block' as const,
      _key: mkKey(),
      style: 'normal' as const,
      markDefs: [{_type: 'link' as const, _key: 'pml-site', href: 'https://philadelphiamusic.live'}],
      children: [
        {_type: 'span' as const, _key: mkKey(), text: 'philadelphiamusic.live', marks: ['pml-site']},
      ],
    },
  ]
}
