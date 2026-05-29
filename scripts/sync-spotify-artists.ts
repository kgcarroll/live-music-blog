/**
 * Curate Ticketmaster events via OpenAI and resolve Spotify artist matches.
 *
 *   npm run spotify-artist:sync
 */
import {formatSpotifyRateLimitMessage} from '@/lib/spotifyApi'
import {syncSpotifyArtistMatchesOnFeed} from '@/lib/spotifyAttractionSync'
import {loadTicketmasterFeedDirect} from '@/lib/ticketmaster'

async function main() {
  const feed = await loadTicketmasterFeedDirect({skipSpotifySync: true})
  if (feed.error) {
    console.error('Ticketmaster feed failed:', feed.error)
    process.exit(1)
  }

  if (!feed.curationInputs.length) {
    console.log('No events with attractions on the feed.')
    process.exit(0)
  }

  const result = await syncSpotifyArtistMatchesOnFeed(feed.curationInputs)

  if (result.rateLimited) {
    console.error(formatSpotifyRateLimitMessage(result.retryAfterMs ?? 60_000))
    if (result.curationsWritten > 0) {
      console.error(
        `${result.curationsWritten} curation(s) saved; Spotify matches pending. Retry after cooldown.`,
      )
    }
    if (result.eventsProcessed > 0) {
      console.error(
        `(Processed ${result.eventsProcessed} event(s), ${result.curationsWritten} curation(s), ${result.matchesWritten} match(es) before the limit.)`,
      )
    }
    process.exit(2)
  }

  if (result.eventsProcessed === 0) {
    console.log('Nothing new to curate (all events at current curation version).')
  }

  console.log(
    `Feed: ${feed.events.length} events, ${feed.curationInputs.length} with attractions. ` +
      `This run: ${result.eventsProcessed} event(s), ${result.curationsWritten} curation(s), ${result.matchesWritten} match(es).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
