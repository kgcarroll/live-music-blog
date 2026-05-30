import {SpotifyEmbed} from '@/components/SpotifyEmbed'
import type {EventSpotifyArtistEmbed} from '@/lib/spotifyArtistMatch'

export function EventSpotifyPanelContent({embeds}: {embeds: EventSpotifyArtistEmbed[]}) {
  if (!embeds.length) return null

  return (
    <>
      <h2 className="text-xs font-medium uppercase tracking-wide text-amber-300">
        Listen before you go
      </h2>
      <div className="mt-3 space-y-4">
        {embeds.map(({attractionName, embed}) => (
          <SpotifyEmbed key={embed.listenUrl} embed={embed} title={attractionName} fillWidth />
        ))}
      </div>
    </>
  )
}
