const EMBED_BASE = 'https://www.youtube-nocookie.com/embed'

export function YouTubeEmbed({videoId, title}: {videoId: string; title?: string | null}) {
  const src = `${EMBED_BASE}/${encodeURIComponent(videoId)}`
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-sm">
      <iframe
        src={src}
        title={title?.trim() || 'YouTube video'}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
