import {editorialHref, editorialTypeLabel} from '@/lib/paths'
import {normalizeDescription} from '@/lib/portableTextPlain'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {urlForImage} from '@/sanity/lib/image'

export type RssEditorialItem = {
  _id: string
  _type: string
  title?: string | null
  slug?: string | null
  publishedAt?: string | null
  excerpt?: string | null
  seoDescription?: string | null
  author?: {name?: string | null} | null
  coverImage?: {
    asset?: {_id?: string} | null
  } | null
}

export type RssChannel = {
  title: string
  description: string
  siteUrl: string
  feedUrl: string
  language?: string
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

function itemDescription(item: RssEditorialItem): string {
  return (
    normalizeDescription(item.excerpt) ||
    normalizeDescription(item.seoDescription) ||
    normalizeDescription(item.title) ||
    'Read more on Live Music Blog.'
  )
}

function itemImageUrl(item: RssEditorialItem): string | undefined {
  if (!item.coverImage?.asset?._id) return undefined
  return urlForImage(item.coverImage as never).width(1200).fit('max').url()
}

function formatRssDate(iso: string | null | undefined): string | undefined {
  if (!iso?.trim()) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toUTCString()
}

export function buildRssFeedXml(channel: RssChannel, items: RssEditorialItem[]): string {
  const lastBuildDate = formatRssDate(new Date().toISOString())
  const itemXml = items
    .filter((item) => item.slug?.trim() && item.title?.trim() && item.publishedAt)
    .map((item) => {
      const slug = item.slug!.trim()
      const link = absoluteSiteUrl(editorialHref(item._type, slug))
      const title = item.title!.trim()
      const pubDate = formatRssDate(item.publishedAt)
      const description = itemDescription(item)
      const typeLabel = editorialTypeLabel(item._type)
      const authorName = item.author?.name?.trim()
      const imageUrl = itemImageUrl(item)

      const parts = [
        '<item>',
        `<title>${escapeXml(title)}</title>`,
        `<link>${escapeXml(link)}</link>`,
        `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
        pubDate ? `<pubDate>${escapeXml(pubDate)}</pubDate>` : '',
        `<description>${cdata(description)}</description>`,
        `<category>${escapeXml(typeLabel)}</category>`,
        authorName ? `<author>${escapeXml(authorName)}</author>` : '',
        imageUrl
          ? `<enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0"/>`
          : '',
        '</item>',
      ]

      return parts.filter(Boolean).join('')
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.siteUrl)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language ?? 'en-us')}</language>
    ${lastBuildDate ? `<lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>` : ''}
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>
    ${itemXml}
  </channel>
</rss>`
}
