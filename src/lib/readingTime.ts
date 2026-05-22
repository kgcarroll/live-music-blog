import type {TypedObject} from '@portabletext/types'

const WORDS_PER_MINUTE = 200

export function plainTextFromPortableText(value: TypedObject[] | null | undefined): string {
  if (!value?.length) return ''

  return value
    .map((block) => {
      if (!('children' in block) || !Array.isArray(block.children)) return ''
      return block.children
        .map((child: unknown) => {
          if (child == null || typeof child !== 'object' || !('text' in child)) return ''
          const text = (child as {text?: unknown}).text
          return typeof text === 'string' ? text : ''
        })
        .join('')
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

/** Estimated reading time in whole minutes (minimum 1 when any text is present). */
export function readingTimeMinutes(
  ...sources: (TypedObject[] | string | null | undefined)[]
): number | null {
  let words = 0

  for (const source of sources) {
    if (source == null) continue
    if (typeof source === 'string') {
      words += countWords(source)
      continue
    }
    words += countWords(plainTextFromPortableText(source))
  }

  if (words === 0) return null
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`
}
