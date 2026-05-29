import {SpotifyEmbed} from '@/components/SpotifyEmbed'
import {VenueMapStickyAside} from '@/components/VenueDetailLayout'
import {fetchEventSpotifyArtistEmbeds, type TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'

async function EventSpotifyPanel({
  eventId,
  attractions,
}: {
  eventId: string
  attractions: TicketmasterAttractionRef[]
}) {
  const embeds = await fetchEventSpotifyArtistEmbeds(eventId, attractions)
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

/** Sticky sidebar Spotify panel (desktop). Returns null when no matched artists. */
export async function EventSpotifyStickyAside({
  eventId,
  attractions,
}: {
  eventId: string
  attractions: TicketmasterAttractionRef[]
}) {
  const panel = await EventSpotifyPanel({eventId, attractions})
  if (!panel) return null

  return <VenueMapStickyAside>{panel}</VenueMapStickyAside>
}

/** Inline Spotify panel for mobile (non-sticky). Returns null when no matched artists. */
export async function EventSpotifyMobilePanel({
  eventId,
  attractions,
}: {
  eventId: string
  attractions: TicketmasterAttractionRef[]
}) {
  return EventSpotifyPanel({eventId, attractions})
}
