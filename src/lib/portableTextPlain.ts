/** Plain text from Sanity portable text blocks (hub intros, bios, article bodies). */
export function plainTextFromPortableText(value: unknown): string {
  if (!Array.isArray(value)) return ''

  return value
    .map((block: unknown) => {
      if (block == null || typeof block !== 'object') return ''

      if ('_type' in block && block._type === 'imageTextRow' && 'text' in block) {
        return plainTextFromPortableText((block as {text?: unknown}).text)
      }

      if (!('children' in block) || !Array.isArray((block as {children?: unknown}).children)) {
        return ''
      }

      return (block as {children: unknown[]}).children
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

export function normalizeDescription(value: string | null | undefined): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim()
  if (!text) return undefined

  const max = 160
  if (text.length <= max) return text

  const truncated = text.slice(0, max - 1)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.slice(0, lastSpace > 80 ? lastSpace : truncated.length).trim()}…`
}
