import {editorialTypeLabel} from '@/lib/paths'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'

export const SEO_TITLE_MAX_CHARS = 80
export const SEO_DESCRIPTION_MAX_CHARS = 220

export const SEO_GENERATION_INSTRUCTIONS = `You write SEO metadata for a local live-music publication in Philadelphia.
Use the article body as the primary source. The headline is context only—SEO title may differ from it.

Rules for seoTitle:
- About ${SEO_TITLE_MAX_CHARS} characters or fewer. Never truncate mid-word in your output.
- Clear and specific for search: artist, event, venue, or topic when relevant.
- Plain language. No clickbait, no ALL CAPS, no emojis, no trailing site name.

Rules for seoDescription:
- About ${SEO_DESCRIPTION_MAX_CHARS} characters or fewer. One or two complete sentences. Never truncate mid-word in your output.
- Summarize what the reader will learn. Include Philadelphia or a neighborhood only when naturally relevant.
- Factual, journalistic tone. No "click here", no hashtag stuffing, no AI filler phrases.

Return only valid JSON with keys "seoTitle" and "seoDescription".`

export const NEWSLETTER_ISSUE_SEO_INSTRUCTIONS = `You write SEO metadata for a biweekly Philadelphia live-music newsletter issue published as a web archive page.
Use the newsletter body as the primary source. The issue title and email preview text are context only—the SEO title may differ from both.

Rules for seoTitle:
- About ${SEO_TITLE_MAX_CHARS} characters or fewer. Never truncate mid-word in your output.
- Specific to this digest: artists, venues, tours, or themes covered in the issue.
- Plain language. No clickbait, no ALL CAPS, no emojis, no trailing site name.
- Avoid generic phrases like "latest music news", "music updates", "new reviews", "weekly digest", etc.
- Sound like a human editor wrote it: direct, specific, plain language—not marketing copy or AI filler.

Rules for seoDescription:
- About ${SEO_DESCRIPTION_MAX_CHARS} characters or fewer. One or two complete sentences. Never truncate mid-word in your output.
- Summarize what readers will find in this issue (news, reviews, interviews). Mention Philadelphia only when natural.
- Factual tone. No "click here", no hashtag stuffing, no AI filler phrases.
- Avoid generic phrases like "latest music news", "music updates", "new reviews", "weekly digest", etc.
- Sound like a human editor wrote it: direct, specific, plain language—not marketing copy or AI filler.

Return only valid JSON with keys "seoTitle" and "seoDescription".`

export type SeoGenerationArticle = {
  _type: string
  title?: string | null
  slug?: string | null
  excerpt?: string | null
  previewText?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  verdict?: string | null
  showDate?: string | null
  venueName?: string | null
  body?: unknown
}

export function isSeoEditorialType(type: string): boolean {
  return type === 'interview' || type === 'news' || type === 'review'
}

export function isSeoGeneratableType(type: string): boolean {
  return isSeoEditorialType(type) || type === 'newsletterIssue'
}

function seoInstructionsForType(type: string): string {
  return type === 'newsletterIssue' ? NEWSLETTER_ISSUE_SEO_INSTRUCTIONS : SEO_GENERATION_INSTRUCTIONS
}

export function buildSeoGenerationContext(article: SeoGenerationArticle): string {
  const bodyPreview = plainTextFromPortableText(article.body as never).slice(0, 2500)

  if (article._type === 'newsletterIssue') {
    const lines = [
      'Content type: Newsletter issue (web archive)',
      `Issue title: ${article.title?.trim() || 'Untitled'}`,
      article.previewText?.trim() ? `Email preview text: ${article.previewText.trim()}` : '',
      bodyPreview ? `Newsletter body:\n${bodyPreview}` : '',
    ]
    return lines.filter(Boolean).join('\n\n')
  }

  const lines = [
    `Article type: ${editorialTypeLabel(article._type)}`,
    `Headline: ${article.title?.trim() || 'Untitled'}`,
    article.excerpt?.trim() ? `Excerpt: ${article.excerpt.trim()}` : '',
    article.verdict?.trim() ? `Verdict: ${article.verdict.trim()}` : '',
    article.venueName?.trim() ? `Venue: ${article.venueName.trim()}` : '',
    article.showDate?.trim() ? `Show date: ${article.showDate.trim()}` : '',
    bodyPreview ? `Article body:\n${bodyPreview}` : '',
  ]
  return lines.filter(Boolean).join('\n\n')
}

export function trimSeoTitle(text: string, max = SEO_TITLE_MAX_CHARS): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (trimmed.length <= max) return trimmed

  const slice = trimmed.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()
}

export function trimSeoDescription(text: string, max = SEO_DESCRIPTION_MAX_CHARS): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= max) return normalized

  const truncated = normalized.slice(0, max - 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.slice(0, lastSpace > 80 ? lastSpace : truncated.length).trim()}…`
}

type OpenAIChatResponse = {
  choices?: Array<{message?: {content?: string | null}}>
  error?: {message?: string}
}

export type GenerateSeoOptions = {
  regenerate?: boolean
  previousSeoTitle?: string | null
  previousSeoDescription?: string | null
  additionalPrompt?: string | null
}

type SeoJson = {
  seoTitle?: string
  seoDescription?: string
}

function parseSeoJson(raw: string): SeoJson {
  try {
    return JSON.parse(raw) as SeoJson
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('OpenAI returned invalid SEO JSON.')
    return JSON.parse(match[0]) as SeoJson
  }
}

export async function generateSeoWithOpenAI(
  article: SeoGenerationArticle,
  options: GenerateSeoOptions = {},
): Promise<{seoTitle: string; seoDescription: string; model: string}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.')
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const context = buildSeoGenerationContext(article)
  const regenerate = options.regenerate === true
  const previousTitle = options.previousSeoTitle?.trim()
  const previousDescription = options.previousSeoDescription?.trim()
  const additionalPrompt = options.additionalPrompt?.trim()
  const additionalInstructions = additionalPrompt
    ? `Additional instructions:\n---\n${additionalPrompt}\n---`
    : ''

  const userPrompt = regenerate
    ? [
        'Write new SEO metadata from the article body below.',
        previousTitle || previousDescription
          ? [
              'Previous SEO (write something different—new wording, not a close paraphrase):',
              previousTitle ? `Previous title: ${previousTitle}` : '',
              previousDescription ? `Previous description: ${previousDescription}` : '',
            ]
              .filter(Boolean)
              .join('\n')
          : '',
        additionalInstructions,
        context,
      ]
        .filter(Boolean)
        .join('\n\n')
    : [
        'Write SEO metadata from the article body below.',
        additionalInstructions,
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
      temperature: regenerate ? 0.7 : 0.4,
      max_tokens: 300,
      response_format: {type: 'json_object'},
      messages: [
        {role: 'system', content: seoInstructionsForType(article._type)},
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
    throw new Error('OpenAI returned empty SEO metadata.')
  }

  const parsed = parseSeoJson(raw)
  const seoTitle = trimSeoTitle(String(parsed.seoTitle ?? ''))
  const seoDescription = trimSeoDescription(String(parsed.seoDescription ?? ''))

  if (!seoTitle || !seoDescription) {
    throw new Error('OpenAI returned incomplete SEO metadata.')
  }

  return {seoTitle, seoDescription, model}
}
