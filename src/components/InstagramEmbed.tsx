'use client'

import Script from 'next/script'
import {useEffect} from 'react'

import {
  instagramEmbedLayout,
  instagramEmbedPermalink,
  type InstagramEmbedInfo,
} from '@/lib/instagram'

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void
      }
    }
  }
}

const INSTAGRAM_EMBED_SCRIPT = 'https://www.instagram.com/embed.js'

function processInstagramEmbeds() {
  window.instgrm?.Embeds.process()
}

export function InstagramEmbed({
  embed,
  title,
}: {
  embed: InstagramEmbedInfo
  title?: string | null
}) {
  const {minWidthPx, maxWidthPx} = instagramEmbedLayout(embed.kind)
  const permalink = instagramEmbedPermalink(embed.permalink)
  const label = title?.trim() || 'Instagram post'

  useEffect(() => {
    processInstagramEmbeds()
  }, [permalink])

  return (
    <figure
      className="mx-auto w-full [&_iframe]:!overflow-hidden"
      style={{
        minWidth: minWidthPx,
        maxWidth: maxWidthPx,
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
        <blockquote
          className="instagram-media !m-0 !min-w-0 !w-full"
          data-instgrm-captioned
          data-instgrm-permalink={permalink}
          data-instgrm-version="14"
          style={{
            background: '#FFF',
            border: 0,
            borderRadius: 3,
            boxShadow: '0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)',
            margin: 0,
            maxWidth: maxWidthPx,
            minWidth: minWidthPx,
            padding: 0,
            width: 'calc(100% - 2px)',
          }}
        >
          <div style={{padding: '16px'}}>
            <a
              href={embed.permalink}
              style={{
                background: '#FFFFFF',
                lineHeight: 0,
                padding: '0 0',
                textAlign: 'center',
                textDecoration: 'none',
                width: '100%',
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          </div>
        </blockquote>
      </div>
      <Script
        id="instagram-embed-js"
        src={INSTAGRAM_EMBED_SCRIPT}
        strategy="lazyOnload"
        onLoad={processInstagramEmbeds}
      />
    </figure>
  )
}
