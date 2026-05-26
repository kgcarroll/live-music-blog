import {editorialHref, editorialTypeLabel} from '@/lib/paths'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {absoluteSiteUrl} from '@/lib/siteUrl'

export const FACEBOOK_CAPTION_MAX_WORDS = 50

export const FACEBOOK_CAPTION_INSTRUCTIONS = `Write a short Facebook post promoting this music news article for a local live-music publication.
Keep under 50 words. Never truncate the text.
Make it one or two sentences.
Paragraphs are allowed.
Avoid clickbait.
Sound like a human editor wrote it: direct, specific, plain language—not marketing copy or AI filler. It should read like a human wrote it for a local live-music publication.
Do not use emojis, emoticons, or hashtags.
Avoid exclamation marks unless the source material truly calls for one (default to none).
Do not use phrases like "dive in", "stunning", "mesmerizing", "don't miss", "game-changer", "whether you're a fan or not", "here's why", "in a world where", or stacked rhetorical questions.`

export type FacebookCaptionArticle = {
  _type: string
  title?: string | null
  slug?: string | null
  publishedAt?: string | null
  excerpt?: string | null
  seoDescription?: string | null
  verdict?: string | null
  showDate?: string | null
  venueName?: string | null
  body?: unknown
}

export function isFacebookCaptionEditorialType(type: string): boolean {
  return type === 'interview' || type === 'news' || type === 'review'
}

export function articleUrlForFacebookCaption(article: FacebookCaptionArticle): string | null {
  const slug = article.slug?.trim()
  if (!slug || !isFacebookCaptionEditorialType(article._type)) return null
  return absoluteSiteUrl(editorialHref(article._type, slug))
}

export function buildFacebookCaptionContext(article: FacebookCaptionArticle): string {
  const url = articleUrlForFacebookCaption(article)
  const bodyPreview = plainTextFromPortableText(article.body as never).slice(0, 1200)
  const lines = [
    `Article type: ${editorialTypeLabel(article._type)}`,
    `Title: ${article.title?.trim() || 'Untitled'}`,
    url ? `URL: ${url}` : '',
    article.excerpt?.trim() ? `Excerpt: ${article.excerpt.trim()}` : '',
    article.seoDescription?.trim() ? `SEO description: ${article.seoDescription.trim()}` : '',
    article.verdict?.trim() ? `Verdict: ${article.verdict.trim()}` : '',
    article.venueName?.trim() ? `Venue: ${article.venueName.trim()}` : '',
    article.showDate?.trim() ? `Show date: ${article.showDate.trim()}` : '',
    bodyPreview ? `Body preview: ${bodyPreview}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

export function trimToMaxWords(text: string, maxWords = FACEBOOK_CAPTION_MAX_WORDS): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s+/)
  if (words.length <= maxWords) return trimmed
  return `${words.slice(0, maxWords).join(' ')}…`
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** Remove emoji and emoticon characters from model output. */
export function stripEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim()
}

type OpenAIChatResponse = {
  choices?: Array<{message?: {content?: string | null}}>
  error?: {message?: string}
}

export type GenerateFacebookCaptionOptions = {
  /** When true, ask for a fresh variant and avoid repeating previousCaption. */
  regenerate?: boolean
  previousCaption?: string | null
  /** Extra editor-provided instructions for regenerate. */
  additionalPrompt?: string | null
}

export async function generateFacebookCaptionWithOpenAI(
  article: FacebookCaptionArticle,
  options: GenerateFacebookCaptionOptions = {},
): Promise<{caption: string; model: string}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.')
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const context = buildFacebookCaptionContext(article)
  const regenerate = options.regenerate === true
  const previous = options.previousCaption?.trim()
  const additionalPrompt = options.additionalPrompt?.trim()

  const userPrompt = regenerate
    ? [
        'Write a new Facebook post for this article.',
        'Use a different opening line and sentence structure than any earlier draft.',
        previous
          ? 'Do not reuse phrasing from this previous caption (no close paraphrase):\n---\n' +
            previous +
            '\n---'
          : '',
        additionalPrompt ? `Additional instructions:\n---\n${additionalPrompt}\n---` : '',
        context,
      ]
        .filter(Boolean)
        .join('\n\n')
    : `Write the Facebook post for this article.\n\n${context}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: regenerate ? 0.9 : 0.5,
      presence_penalty: regenerate ? 0.5 : 0,
      frequency_penalty: regenerate ? 0.4 : 0,
      max_tokens: 200,
      messages: [
        {role: 'system', content: FACEBOOK_CAPTION_INSTRUCTIONS},
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
    throw new Error('OpenAI returned an empty caption.')
  }

  return {caption: trimToMaxWords(stripEmojis(raw)), model}
}
