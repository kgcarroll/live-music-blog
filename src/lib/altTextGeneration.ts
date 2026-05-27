import {stripEmojis} from '@/lib/facebookCaption'

export const ALT_TEXT_MAX_CHARS = 140

export const ALT_TEXT_INSTRUCTIONS = `Write concise, descriptive alt text for an image used on a music publication website.

Rules:
- Describe what is visible in the image (people, instruments, stage, crowd, setting).
- Keep it under ${ALT_TEXT_MAX_CHARS} characters.
- No emojis, no hashtags, no quotes.
- Do not start with \"Image of\" or \"Photo of\".
- If the image appears to be a flyer/poster with readable text, describe it briefly instead of transcribing everything.` as const

type OpenAIChatResponse = {
  choices?: Array<{message?: {content?: string | null}}>
  error?: {message?: string}
}

function clampAlt(text: string): string {
  const cleaned = stripEmojis(text).replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (cleaned.length <= ALT_TEXT_MAX_CHARS) return cleaned
  const slice = cleaned.slice(0, ALT_TEXT_MAX_CHARS - 1)
  const lastSpace = slice.lastIndexOf(' ')
  return `${(lastSpace > 50 ? slice.slice(0, lastSpace) : slice).trim()}…`
}

export async function generateAltTextWithOpenAI(options: {
  imageUrl: string
  documentType?: string
  documentTitle?: string
  captionHint?: string
}): Promise<{alt: string; model: string}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.')
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const contextLines = [
    options.documentType ? `Document type: ${options.documentType}` : '',
    options.documentTitle ? `Document title: ${options.documentTitle}` : '',
    options.captionHint ? `Caption hint: ${options.captionHint}` : '',
  ].filter(Boolean)

  const userText = contextLines.length
    ? `Write alt text for the attached image.\n\n${contextLines.join('\n')}`
    : 'Write alt text for the attached image.'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {role: 'system', content: ALT_TEXT_INSTRUCTIONS},
        {
          role: 'user',
          content: [
            {type: 'text', text: userText},
            {type: 'image_url', image_url: {url: options.imageUrl}},
          ],
        },
      ],
    }),
  })

  const data = (await response.json().catch(() => ({}))) as OpenAIChatResponse
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed (${response.status})`)
  }

  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('OpenAI returned empty alt text.')
  }

  const alt = clampAlt(raw)
  if (!alt) throw new Error('OpenAI returned empty alt text.')

  return {alt, model}
}

