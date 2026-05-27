import {absoluteSiteUrl} from '@/lib/siteUrl'
import {parseRss, type RssItem} from '@/lib/rss'

type OpenAIChatResponse = {
  choices?: {message?: {content?: string}}[]
  error?: {message?: string}
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // Attempt recovery if the model wrapped JSON with extra text.
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const slice = trimmed.slice(start, end + 1)
      return JSON.parse(slice)
    }
    throw new Error('OpenAI returned invalid JSON.')
  }
}

export type NewsletterDigestItem = {
  headline: string
  excerpt: string
  url: string
}

export type NewsletterDigestIntro = {
  paragraphs: string[]
}

function clampText(s: string, max = 280) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function safeDate(value: string | null): number | null {
  if (!value) return null
  const n = Date.parse(value)
  return Number.isFinite(n) ? n : null
}

function withinLastDays(item: RssItem, days: number, now: number) {
  const ts = safeDate(item.publishedAt)
  if (ts == null) return true // RSS entries without dates: include (better than dropping everything)
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return ts >= cutoff
}

export async function fetchRecentFeedItems(days: number): Promise<RssItem[]> {
  const url = absoluteSiteUrl('/feed.xml')
  const rssResponse = await fetch(url, {cache: 'no-store'})
  if (!rssResponse.ok) throw new Error(`RSS fetch failed (${rssResponse.status})`)
  const xml = await rssResponse.text()
  const items = parseRss(xml)
  const now = Date.now()
  return items.filter((it) => withinLastDays(it, days, now))
}

export async function generateNewsletterDigestWithOpenAI(options: {
  days: number
  maxItems: number
}): Promise<{
  intro: NewsletterDigestIntro
  items: NewsletterDigestItem[]
  model: string
  rawRssItemCount: number
  filteredItemCount: number
  selectedItemCount: number
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.')

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const url = absoluteSiteUrl('/feed.xml')
  const response = await fetch(url, {cache: 'no-store'})
  if (!response.ok) throw new Error(`RSS fetch failed (${response.status})`)
  const xml = await response.text()
  const rawItems = parseRss(xml)
  const rawRssItemCount = rawItems.length

  const now = Date.now()
  const feedItems = rawItems.filter((it) => withinLastDays(it, options.days, now))
  const filteredItemCount = feedItems.length

  const selected = feedItems.slice(0, options.maxItems)
  const selectedItemCount = selected.length

  // Minimal, predictable input for the model.
  const payload = selected.map((it) => ({
    title: it.title,
    url: it.link,
    description: it.description ? clampText(it.description, 600) : null,
    publishedAt: it.publishedAt,
  }))

  const system =
    'You write newsletter blurbs from a list of recent articles. ' +
    'Return ONLY valid JSON: {"intro":{"paragraphs":[string]},"items":[{headline, excerpt, url}]}. ' +
    'intro.paragraphs must be 1-2 paragraphs, plain text, friendly, and summarize what is in this digest.' +
    'intro.paragraphs should not use AI-sounding words or filler text. ' +
    'Rules: headline should be the original title or a light edit (no clickbait). ' +
    'excerpt must be 2-3 sentences, plain text, conversational, and avoid flowery AI-sounding words. ' +
    'url must match an input url exactly. Do not invent content.'

  const user = JSON.stringify({days: options.days, items: payload})

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

  const parsed = parseJsonObject(raw) as {intro?: unknown; items?: unknown} | null
  const introParagraphs = Array.isArray((parsed as any)?.intro?.paragraphs)
    ? ((parsed as any).intro.paragraphs as unknown[])
        .map((p: unknown) => String(p ?? '').trim())
        .filter(Boolean)
        .slice(0, 2)
    : []

  const list = Array.isArray(parsed?.items) ? (parsed.items as unknown[]) : null
  if (!list) throw new Error('OpenAI returned invalid newsletter JSON shape.')
  const items = list
    .map((x: unknown) => ({
      headline: String((x as {headline?: unknown})?.headline ?? '').trim(),
      excerpt: String((x as {excerpt?: unknown})?.excerpt ?? '').trim(),
      url: String((x as {url?: unknown})?.url ?? '').trim(),
    }))
    .filter((x: NewsletterDigestItem) => x.headline && x.excerpt && x.url)

  // Ensure URLs are from the provided list.
  const allowed = new Set(payload.map((p) => p.url))
  const filtered = items.filter((x: NewsletterDigestItem) => allowed.has(x.url))
  if (!filtered.length) throw new Error('OpenAI returned no usable newsletter items.')

  return {
    intro: {paragraphs: introParagraphs.length ? introParagraphs : ['Here are the latest stories from the last 30 days.']},
    items: filtered,
    model,
    rawRssItemCount,
    filteredItemCount,
    selectedItemCount,
  }
}

export function digestItemsToPortableText(input: {
  intro: NewsletterDigestIntro
  items: NewsletterDigestItem[]
}) {
  const mkKey = () => Math.random().toString(16).slice(2, 10)
  const {intro, items} = input

  return [
    ...(intro.paragraphs ?? []).map((p) => ({
      _type: 'block',
      _key: mkKey(),
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: mkKey(), text: p, marks: []}],
    })),
    ...items.flatMap((it) => {
      const linkKey = mkKey()
      return [
        {
          _type: 'block',
          _key: mkKey(),
          style: 'h3',
          markDefs: [],
          children: [{_type: 'span', _key: mkKey(), text: it.headline, marks: []}],
        },
        {
          _type: 'block',
          _key: mkKey(),
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: mkKey(), text: it.excerpt, marks: []}],
        },
        {
          _type: 'block',
          _key: mkKey(),
          style: 'normal',
          markDefs: [{_type: 'link', _key: linkKey, href: it.url}],
          children: [{_type: 'span', _key: mkKey(), text: 'Read more', marks: [linkKey]}],
        },
      ]
    }),
    {
      _type: 'block',
      _key: mkKey(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: mkKey(),
          text: 'Thank you for reading Philadelphia Music Live.',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: mkKey(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: mkKey(),
          text:
            'If you enjoy our coverage of concerts, new music, and artist news from Philadelphia and beyond, consider sharing our stories with fellow music fans and following us on social media for daily updates.',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: mkKey(),
      style: 'normal',
      markDefs: [{_type: 'link', _key: 'pml-site', href: 'https://philadelphiamusic.live'}],
      children: [{_type: 'span', _key: mkKey(), text: 'philadelphiamusic.live', marks: ['pml-site']}],
    },
  ]
}

