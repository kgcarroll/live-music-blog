import Link from 'next/link'
import {SpotifyIcon} from '@/components/SpotifyIcon'
import {SPOTIFY_EMBED_MAX_WIDTH, type SpotifyEmbedInfo} from '@/lib/spotify'

export function SpotifyEmbed({
  embed,
  title,
}: {
  embed: SpotifyEmbedInfo
  title?: string | null
}) {
  const iframeTitle = title?.trim() || `Spotify ${embed.type} player`
  const maxWidth = Math.min(embed.width, SPOTIFY_EMBED_MAX_WIDTH)

  return (
    <figure className="not-prose mx-auto w-full" style={{maxWidth}}>
      <iframe
        src={embed.embedSrc}
        title={iframeTitle}
        width="100%"
        height={embed.height}
        style={{borderRadius: 12, display: 'block'}}
        className="w-full border-0 bg-transparent"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>Embedded from Spotify</span>
        <Link
          href={embed.listenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-amber-300/90 transition hover:text-amber-200"
        >
          Open in Spotify
          <SpotifyIcon className="size-3 shrink-0" />
        </Link>
      </figcaption>
    </figure>
  )
}
