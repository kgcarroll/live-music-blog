import {editorialTypeLabel} from '@/lib/paths'
import {plainTextFromPortableText} from '@/lib/portableTextPlain'

export const TAG_SUGGESTION_MIN = 3
export const TAG_SUGGESTION_MAX = 8

export const TAG_SUGGESTION_INSTRUCTIONS = `You suggest tags for a local live-music publication.

You must select existing tags from the provided list (by id). Do not invent ids.

Rules:
- Suggest ${TAG_SUGGESTION_MIN}–${TAG_SUGGESTION_MAX} tags max.
- Prefer specific artist, venue, festival, or organization tags over generic ones.
- Avoid redundant near-duplicates.
- Do not include any tag that is already present on the article.
- You may also propose \"newTags\" (strings) for missing tags, but they will NOT be applied automatically.

Return only valid JSON with keys:
- \"tagIds\": string[]   (existing tag document ids)
- \"newTags\": string[] (suggested new tag titles)` as const

export type TagSuggestionArticle = {
  _type: string
  title?: string | null
  excerpt?: string | null
  body?: unknown
  tags?: Array<{_ref?: string | null}> | null
}

export type ExistingTag = {
  _id: string
  title: string
  slug?: string | null
}

export function isTagSuggestionEditorialType(type: string): boolean {
  return type === 'interview' || type === 'news' || type === 'review'
}

export function buildTagSuggestionContext(article: TagSuggestionArticle): string {
  const bodyText = plainTextFromPortableText(article.body as never).slice(0, 2500)
  const lines = [
    `Article type: ${editorialTypeLabel(article._type)}`,
    `Title: ${article.title?.trim() || 'Untitled'}`,
    article.excerpt?.trim() ? `Excerpt: ${article.excerpt.trim()}` : '',
    bodyText ? `Body:\n${bodyText}` : '',
  ]
  return lines.filter(Boolean).join('\n\n')
}

type OpenAIChatResponse = {
  choices?: Array<{message?: {content?: string | null}}>
  error?: {message?: string}
}

type TagSuggestionJson = {
  tagIds?: unknown
  newTags?: unknown
}

function parseJsonObject(raw: string): TagSuggestionJson {
  try {
    return JSON.parse(raw) as TagSuggestionJson
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('OpenAI returned invalid tag JSON.')
    return JSON.parse(match[0]) as TagSuggestionJson
  }
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
}

export async function suggestTagsWithOpenAI(input: {
  article: TagSuggestionArticle
  existingTags: ExistingTag[]
  additionalPrompt?: string | null
}): Promise<{tagIds: string[]; newTags: string[]; model: string}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.')

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const context = buildTagSuggestionContext(input.article)

  const existing = input.existingTags
    .map((t) => `${t._id}\t${t.title}${t.slug ? `\t/tags/${t.slug}` : ''}`)
    .join('\n')

  const currentTagIds = new Set(
    (input.article.tags ?? [])
      .map((t) => (typeof t?._ref === 'string' ? t._ref : ''))
      .filter(Boolean),
  )

  const additional = String(input.additionalPrompt ?? '').trim()
  const additionalBlock = additional ? `Additional instructions:\n---\n${additional}\n---` : ''

  const userPrompt = [
    'Suggest tags for this article.',
    additionalBlock,
    `Current tag ids (do not include these): ${Array.from(currentTagIds).join(', ') || '(none)'}`,
    'Existing tags (choose by id from this list):',
    existing || '(no tags in dataset)',
    'Article:',
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
      temperature: 0.3,
      max_tokens: 300,
      response_format: {type: 'json_object'},
      messages: [
        {role: 'system', content: TAG_SUGGESTION_INSTRUCTIONS},
        {role: 'user', content: userPrompt},
      ],
    }),
  })

  const data = (await response.json().catch(() => ({}))) as OpenAIChatResponse
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed (${response.status})`)
  }

  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error('OpenAI returned empty tag suggestions.')

  const parsed = parseJsonObject(raw)
  const tagIds = coerceStringArray(parsed.tagIds)
    .filter((id) => !currentTagIds.has(id))
    .slice(0, TAG_SUGGESTION_MAX)

  // Ensure ids exist in the provided list (guardrail against hallucinated ids)
  const allowed = new Set(input.existingTags.map((t) => t._id))
  const filteredTagIds = tagIds.filter((id) => allowed.has(id))

  const newTags = coerceStringArray(parsed.newTags).slice(0, TAG_SUGGESTION_MAX)

  const ensuredMin = filteredTagIds.length >= TAG_SUGGESTION_MIN ? filteredTagIds : filteredTagIds
  return {tagIds: ensuredMin, newTags, model}
}

