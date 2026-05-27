import {XMLParser} from 'fast-xml-parser'

export type RssItem = {
  title: string
  link: string
  publishedAt: string | null
  description: string | null
}

function asText(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v == null) return null
  return String(v)
}

function cleanHtmlToText(input: string): string {
  // RSS descriptions are often HTML; keep this lightweight (no DOM dependency).
  const withoutTags = input.replace(/<[^>]*>/g, ' ')
  return withoutTags.replace(/\s+/g, ' ').trim()
}

export function parseRss(xml: string): RssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    // RSS feeds frequently contain HTML in <description>; keep it as text.
    processEntities: true,
  })

  const parsed = parser.parse(xml) as any
  const items = parsed?.rss?.channel?.item
  const list: any[] = Array.isArray(items) ? items : items ? [items] : []

  return list
    .map((it) => {
      const title = asText(it?.title)?.trim() || ''
      const link = asText(it?.link)?.trim() || ''
      const pubDate = asText(it?.pubDate)?.trim() || null
      const descriptionRaw = asText(it?.description)?.trim() || null
      const description = descriptionRaw ? cleanHtmlToText(descriptionRaw) : null
      return {title, link, publishedAt: pubDate, description}
    })
    .filter((it) => it.title && it.link)
}

