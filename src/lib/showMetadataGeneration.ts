import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {formatScheduleEventWhen, formatScheduleVenue, getEventIndex} from '@/lib/ticketmaster'
import {getSanityServerClient} from '@/sanity/lib/serverClient'

export type ShowMetadataGenerationArticle = {
  _type: string
  title?: string | null
  excerpt?: string | null
  verdict?: string | null
  reviewSubject?: string | null
  showDate?: string | null
  venueName?: string | null
  body?: unknown
}

export type ShowMetadataSuggestion = {
  showDate: string | null
  venueName: string | null
  confidence: 'high' | 'medium' | 'low'
  note: string | null
}

export const SHOW_METADATA_GENERATION_INSTRUCTIONS = `You extract live CONCERT performance metadata from concert review articles for JSON-LD structured data.

The editor has marked this review as a live concert. Do not treat album, video, or streaming reviews as concerts.

Return JSON:
{
  "showDate": ISO 8601 datetime for when the concert performance occurred, or null if unknown,
  "venueName": venue name as commonly capitalized (e.g. "Union Transfer", "The Fillmore"), or null if unknown,
  "confidence": "high" | "medium" | "low",
  "note": brief note for the editor explaining your choice
}

Rules:
- Extract the PERFORMANCE date and time the reviewer attended, NOT the article publish date.
- Prefer dates that match the Ticketmaster schedule or event archive reference lists when the review clearly describes that show.
- Use America/New_York timezone for Philadelphia-area shows when inferring time (include offset in ISO string).
- If the review mentions a date but no time, use 20:00:00 local for evening shows, or noon for matinees.
- venueName: proper venue name without city/state unless needed to disambiguate.
- For festivals, use the festival or main stage venue name when clear from the text.
- If uncertain, set confidence to "medium" or "low" and explain in note.
- Do not invent venues or dates unsupported by the article or reference lists.
- Return null for showDate or venueName when the article does not support a value.`

const ARCHIVE_REFERENCE_QUERY = `*[_type == "eventArchive"] | order(startDateTime desc) [0...60] {
  name,
  localDate,
  localTime,
  venueName,
  venueCity,
  venueState
}`

type ArchiveReferenceRow = {
  name?: string | null
  localDate?: string | null
  localTime?: string | null
  venueName?: string | null
  venueCity?: string | null
  venueState?: string | null
}

async function buildScheduleReferenceContext(): Promise<string> {
  const sections: string[] = []

  const index = await getEventIndex()
  if (!index.error && index.events.length) {
    const lines = index.events.slice(0, 50).map((event) => {
      const when = formatScheduleEventWhen(event).label
      const venue = formatScheduleVenue(event) ?? 'Venue TBA'
      return `- ${event.name} | ${when} | ${venue}`
    })
    sections.push(`Upcoming Ticketmaster schedule:\n${lines.join('\n')}`)
  }

  const archives = await getSanityServerClient().fetch<ArchiveReferenceRow[]>(
    ARCHIVE_REFERENCE_QUERY,
    {},
    {useCdn: false},
  )
  if (archives.length) {
    const lines = archives.map((row) => {
      const when = row.localDate
        ? `${row.localDate}${row.localTime && !row.localTime.startsWith('00:00') ? ` ${row.localTime}` : ''}`
        : 'Date TBA'
      const venue = [row.venueName, row.venueCity, row.venueState].filter(Boolean).join(' · ') || 'Venue TBA'
      return `- ${row.name ?? 'Untitled'} | ${when} | ${venue}`
    })
    sections.push(`Recent archived past shows:\n${lines.join('\n')}`)
  }

  return sections.join('\n\n')
}

export function buildShowMetadataGenerationContext(article: ShowMetadataGenerationArticle): string {
  const bodyPreview = plainTextFromPortableText(article.body as never).slice(0, 3000)

  const lines = [
    'Article type: Review',
    `Headline: ${article.title?.trim() || 'Untitled'}`,
    article.excerpt?.trim() ? `Excerpt: ${article.excerpt.trim()}` : '',
    article.verdict?.trim() ? `Verdict: ${article.verdict.trim()}` : '',
    article.venueName?.trim() ? `Current venue field: ${article.venueName.trim()}` : '',
    article.showDate?.trim() ? `Current show date field: ${article.showDate.trim()}` : '',
    bodyPreview ? `Article body:\n${bodyPreview}` : '',
  ]

  return lines.filter(Boolean).join('\n\n')
}

function parseShowMetadataJson(raw: string): ShowMetadataSuggestion {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('OpenAI returned invalid show metadata JSON.')
    parsed = JSON.parse(match[0]) as Record<string, unknown>
  }

  const confidenceRaw = String(parsed.confidence ?? 'low').trim().toLowerCase()
  const confidence: ShowMetadataSuggestion['confidence'] =
    confidenceRaw === 'high' || confidenceRaw === 'medium' ? confidenceRaw : 'low'

  return {
    showDate: normalizeShowDate(parsed.showDate),
    venueName: normalizeVenueName(parsed.venueName),
    confidence,
    note: typeof parsed.note === 'string' && parsed.note.trim() ? parsed.note.trim() : null,
  }
}

export function normalizeShowDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value.trim())
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function normalizeVenueName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 120) : null
}

type OpenAIChatResponse = {
  choices?: Array<{message?: {content?: string | null}}>
  error?: {message?: string}
}

export type GenerateShowMetadataOptions = {
  regenerate?: boolean
  previousShowDate?: string | null
  previousVenueName?: string | null
  additionalPrompt?: string | null
}

export async function generateShowMetadataWithOpenAI(
  article: ShowMetadataGenerationArticle,
  options: GenerateShowMetadataOptions = {},
): Promise<ShowMetadataSuggestion & {model: string}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.')
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const scheduleReference = await buildScheduleReferenceContext()
  const context = buildShowMetadataGenerationContext(article)
  const regenerate = options.regenerate === true
  const additionalPrompt = options.additionalPrompt?.trim()
  const additionalInstructions = additionalPrompt
    ? `Additional instructions:\n---\n${additionalPrompt}\n---`
    : ''

  const userPrompt = [
    regenerate
      ? 'Suggest new show date and venue metadata from the review below.'
      : 'Suggest show date and venue metadata from the review below.',
    options.previousShowDate || options.previousVenueName
      ? [
          'Previous suggestion (try a refined answer if the review supports it):',
          options.previousShowDate ? `Previous show date: ${options.previousShowDate}` : '',
          options.previousVenueName ? `Previous venue: ${options.previousVenueName}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    additionalInstructions,
    scheduleReference,
    context,
  ]
    .filter(Boolean)
    .join('\n\n')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: regenerate ? 0.5 : 0.3,
      max_tokens: 250,
      response_format: {type: 'json_object'},
      messages: [
        {role: 'system', content: SHOW_METADATA_GENERATION_INSTRUCTIONS},
        {role: 'user', content: userPrompt},
      ],
    }),
  })

  const data = (await response.json().catch(() => ({}))) as OpenAIChatResponse
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed (${response.status})`)
  }

  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('OpenAI returned empty show metadata.')
  }

  const parsed = parseShowMetadataJson(raw)
  if (!parsed.showDate && !parsed.venueName) {
    throw new Error(
      'OpenAI could not infer a show date or venue from this review. Add more detail to the body or set the fields manually.',
    )
  }

  return {...parsed, model}
}
