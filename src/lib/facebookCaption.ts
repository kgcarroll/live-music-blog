import {editorialHref, editorialTypeLabel} from '@/lib/paths'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'
import {absoluteSiteUrl} from '@/lib/siteUrl'

export const FACEBOOK_CAPTION_MAX_WORDS = 50

export const FACEBOOK_CAPTION_INSTRUCTIONS = `Write a Facebook post promoting a music news or review article for Philadelphia Music Live, a local independent live-music publication covering Philadelphia, touring artists, concerts, and music culture.

The tone should feel like it was written by a real music editor — concise, conversational, informed, and slightly informal without sounding sloppy. Avoid corporate language, marketing tone, fan-club hype, or AI-sounding phrasing.

Requirements:

* Keep under 50 words.
* Never truncate the text.
* Write 1–2 short sentences.
* Paragraph breaks are allowed if natural.
* Prioritize specificity over hype.
* Focus on the actual news, performance, tour, release, or local relevance.
* Sound natural for Facebook readers who already follow music news.

Style guidelines:

* Write like a local music publication, not a brand account.
* Use plain language and varied sentence structure.
* Subtle attitude or personality is okay if it fits the artist/story.
* Avoid sounding overly enthusiastic unless the story genuinely warrants it.
* Avoid filler transitions and generic framing.
* Do not summarize the entire article.
* Do not directly ask readers to click or read.

Avoid:

* Clickbait
* Marketing copy
* AI filler language
* Hashtags
* Emojis or emoticons
* Exclamation marks unless absolutely warranted
* Quotation marks around headlines
* Rhetorical questions

Never use phrases like:

* "dive in"
* "don't miss"
* "game-changer"
* "whether you're a fan or not"
* "here's why"
* "in a world where"
* "mesmerizing"
* "stunning"
* "must-see"
* "fans are losing it"
* "takes things to the next level"

Preferred qualities:

* Dry wit is acceptable.
* Slightly understated wording is preferred over exaggerated excitement.
* References to Philly or regional relevance are encouraged when appropriate.
* Posts should feel written quickly by someone who actually follows live music news every day.`

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
