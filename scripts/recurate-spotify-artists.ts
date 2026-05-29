/**
 * Re-run OpenAI Spotify curation for feed events (fixes stale/wrong matches).
 *
 *   npm run spotify-artist:recurate
 *   npm run spotify-artist:recurate -- --multi-artist-only --force --limit 20
 *   npm run spotify-artist:recurate -- --curate-only --multi-artist-only --force --limit 20
 */
import {formatSpotifyRateLimitMessage} from '@/lib/spotifyApi'
import {syncSpotifyArtistMatchesOnFeed} from '@/lib/spotifyAttractionSync'
import {loadTicketmasterFeedDirect} from '@/lib/ticketmaster'

function parseArgs(argv: string[]) {
  return {
    force: argv.includes('--force'),
    multiArtistOnly: argv.includes('--multi-artist-only'),
    curateOnly: argv.includes('--curate-only'),
    limit: (() => {
      const index = argv.indexOf('--limit')
      if (index === -1) return undefined
      const value = Number(argv[index + 1])
      return Number.isFinite(value) && value > 0 ? value : undefined
    })(),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const feed = await loadTicketmasterFeedDirect({skipSpotifySync: true})
  if (feed.error) {
    console.error('Ticketmaster feed failed:', feed.error)
    process.exit(1)
  }

  let inputs = feed.curationInputs
  if (args.multiArtistOnly) {
    inputs = inputs.filter((event) => event.attractions.length >= 2)
  }

  if (!inputs.length) {
    console.log('No matching events to recurate.')
    process.exit(0)
  }

  console.log(
    `Recurating up to ${args.limit ?? 'default'} of ${inputs.length} event(s)` +
      `${args.multiArtistOnly ? ' (multi-artist only)' : ''}` +
      `${args.force ? ' with --force' : ''}` +
      `${args.curateOnly ? ' (OpenAI only, no Spotify)' : ''}…`,
  )

  const result = await syncSpotifyArtistMatchesOnFeed(inputs, {
    forceRecuration: args.force,
    multiArtistOnly: args.multiArtistOnly,
    maxEvents: args.limit,
    skipSpotifySearch: args.curateOnly,
  })

  if (result.rateLimited) {
    console.error(formatSpotifyRateLimitMessage(result.retryAfterMs ?? 60_000))
    if (result.curationsWritten > 0) {
      console.error(
        `${result.curationsWritten} curation(s) were saved. Re-run without --curate-only after the wait to resolve Spotify matches.`,
      )
    }
    process.exit(2)
  }

  console.log(
    `Done: ${result.eventsProcessed} event(s), ${result.curationsWritten} curation(s), ${result.matchesWritten} match(es).`,
  )

  if (args.curateOnly && result.curationsWritten > 0) {
    console.log('Run again without --curate-only (after any Spotify cooldown) to resolve artist matches.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
