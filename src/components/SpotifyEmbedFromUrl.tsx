import {SpotifyEmbed} from '@/components/SpotifyEmbed'
import {getSpotifyEmbed, resolveSpotifyEmbed} from '@/lib/spotify'

export async function SpotifyEmbedFromUrl({
  url,
  title,
}: {
  url: string
  title?: string | null
}) {
  const embed = await resolveSpotifyEmbed(url)
  if (!embed) {
    const fallback = getSpotifyEmbed(url)
    if (!fallback) return null
    return <SpotifyEmbed embed={fallback} title={title} />
  }

  return <SpotifyEmbed embed={embed} title={title} />
}
