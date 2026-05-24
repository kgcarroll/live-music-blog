import imageUrlBuilder from '@sanity/image-url'
import type {PortableTextBlock} from '@portabletext/types'

import {getInstagramEmbedInfo} from '@/lib/instagram'
import {getSpotifyEmbed, spotifyEmbedTypeLabel} from '@/lib/spotify'
import {getYouTubeVideoId} from '@/lib/youtube'
import {client} from '@/sanity/lib/client'

const imageBuilder = imageUrlBuilder(client)

type SanityImageValue = {
  asset?: {_ref?: string; url?: string}
  alt?: string
  caption?: string
}

type EmbedValue = {url?: string; title?: string}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function blockStyleTag(style: string | undefined): string {
  switch (style) {
    case 'h2':
      return 'h2'
    case 'h3':
      return 'h3'
    case 'blockquote':
      return 'blockquote'
    default:
      return 'p'
  }
}

function renderChildren(block: PortableTextBlock): string {
  const children = block.children as {text?: string; marks?: string[]; _type?: string}[]
  if (!Array.isArray(children)) return ''

  return children
    .map((child) => {
      if (child._type !== 'span' || typeof child.text !== 'string') return ''
      let text = escapeHtml(child.text)
      const marks = child.marks ?? []
      if (marks.includes('strong')) text = `<strong>${text}</strong>`
      if (marks.includes('em')) text = `<em>${text}</em>`
      const linkKey = marks.find((mark) => mark !== 'strong' && mark !== 'em')
      if (linkKey) {
        const markDef = (block.markDefs ?? []).find((def) => def._key === linkKey && def._type === 'link') as
          | {href?: string}
          | undefined
        const href = typeof markDef?.href === 'string' ? markDef.href : null
        if (href) {
          text = `<a href="${escapeHtml(href)}" style="color:#fbbf24;">${text}</a>`
        }
      }
      return text
    })
    .join('')
}

function renderImage(value: SanityImageValue): string {
  const url = value.asset?.url
    ? imageBuilder.image(value).width(600).auto('format').url()
    : null
  if (!url) return ''
  const alt = escapeHtml(value.alt || '')
  const caption = value.caption ? `<figcaption style="color:#a1a1aa;font-size:14px;">${escapeHtml(value.caption)}</figcaption>` : ''
  return `<figure style="margin:24px 0;"><img src="${escapeHtml(url)}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;" />${caption}</figure>`
}

function renderEmbedLink(label: string, url: string): string {
  return `<p style="margin:16px 0;"><a href="${escapeHtml(url)}" style="color:#fbbf24;">${escapeHtml(label)}</a></p>`
}

function renderBlock(value: Record<string, unknown>): string {
  const type = value._type as string | undefined

  if (type === 'block') {
    const block = value as unknown as PortableTextBlock
    const tag = blockStyleTag(block.style)
    const inner = renderChildren(block)
    if (!inner.trim()) return ''
    const headingStyle =
      tag === 'blockquote'
        ? 'border-left:4px solid #f59e0b;margin:24px 0;padding-left:16px;color:#d4d4d8;font-style:italic;'
        : tag === 'h2'
          ? 'margin:32px 0 12px;font-size:24px;color:#fafafa;'
          : tag === 'h3'
            ? 'margin:24px 0 8px;font-size:20px;color:#f4f4f5;'
            : 'margin:16px 0;line-height:1.6;color:#e4e4e7;'
    return `<${tag} style="${headingStyle}">${inner}</${tag}>`
  }

  if (type === 'image') {
    return renderImage(value as SanityImageValue)
  }

  if (type === 'youtubeEmbed') {
    const embed = value as EmbedValue
    const url = typeof embed.url === 'string' ? embed.url.trim() : ''
    const videoId = getYouTubeVideoId(url)
    if (!videoId) return ''
    const watchUrl = url || `https://www.youtube.com/watch?v=${videoId}`
    const title = typeof embed.title === 'string' ? embed.title : 'Watch on YouTube'
    return renderEmbedLink(`${title} (YouTube)`, watchUrl)
  }

  if (type === 'spotifyEmbed') {
    const embed = value as EmbedValue
    const url = typeof embed.url === 'string' ? embed.url.trim() : ''
    const info = getSpotifyEmbed(url)
    const label = info
      ? `${typeof embed.title === 'string' ? embed.title : 'Listen on Spotify'} (${spotifyEmbedTypeLabel(info.type)})`
      : typeof embed.title === 'string'
        ? embed.title
        : 'Listen on Spotify'
    if (!url) return ''
    return renderEmbedLink(label, url)
  }

  if (type === 'instagramEmbed') {
    const embed = value as EmbedValue
    const url = typeof embed.url === 'string' ? embed.url.trim() : ''
    const info = getInstagramEmbedInfo(url)
    if (!info) return ''
    return renderEmbedLink(typeof embed.title === 'string' ? embed.title : 'View on Instagram', info.permalink)
  }

  return ''
}

function renderListGroup(blocks: Record<string, unknown>[], listStyle: 'bullet' | 'number'): string {
  const tag = listStyle === 'number' ? 'ol' : 'ul'
  const items = blocks
    .map((block) => {
      const inner = renderChildren(block as unknown as PortableTextBlock)
      return inner.trim() ? `<li style="margin:8px 0;">${inner}</li>` : ''
    })
    .filter(Boolean)
    .join('')
  if (!items) return ''
  return `<${tag} style="margin:16px 0;padding-left:24px;color:#e4e4e7;">${items}</${tag}>`
}

export function portableTextToEmailHtml(body: PortableTextBlock[] | null | undefined): string {
  if (!body?.length) return ''

  const chunks: string[] = []
  let listBuffer: Record<string, unknown>[] = []
  let listStyle: 'bullet' | 'number' | null = null

  const flushList = () => {
    if (!listBuffer.length || !listStyle) return
    chunks.push(renderListGroup(listBuffer, listStyle))
    listBuffer = []
    listStyle = null
  }

  for (const raw of body) {
    const value = raw as unknown as Record<string, unknown>
    if (value._type === 'block' && (value.listItem === 'bullet' || value.listItem === 'number')) {
      const itemStyle = value.listItem as 'bullet' | 'number'
      if (listStyle && listStyle !== itemStyle) flushList()
      listStyle = itemStyle
      listBuffer.push(value)
      continue
    }

    flushList()
    const html = renderBlock(value)
    if (html) chunks.push(html)
  }

  flushList()
  return chunks.join('\n')
}

export function wrapNewsletterEmailHtml(options: {
  title: string
  previewText?: string | null
  bodyHtml: string
  archiveUrl: string
  preheader?: string | null
}): {html: string; text: string} {
  const preheader = options.previewText?.trim() || options.preheader?.trim() || ''
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : ''

  const bodyHtml = options.bodyHtml || '<p style="color:#e4e4e7;">(No content)</p>'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #27272a;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#fbbf24;">Philadelphia Music Live</p>
              <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#fafafa;">${escapeHtml(options.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid #27272a;">
              <p style="margin:0 0 12px;font-size:15px;">
                <a href="${escapeHtml(options.archiveUrl)}" style="color:#fbbf24;">Read the full issue on the web</a>
              </p>
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                You are receiving this because you subscribed at philadelphiamusic.live.
                Use the unsubscribe link in this email to opt out.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    options.title,
  preheader ? `\n${preheader}` : '',
    '',
    stripHtml(bodyHtml),
    '',
    `Read online: ${options.archiveUrl}`,
    '',
    'Unsubscribe using the link in the HTML version of this email.',
  ]
    .filter((line, index, arr) => line !== '' || (index > 0 && arr[index - 1] !== ''))
    .join('\n')

  return {html, text}
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
