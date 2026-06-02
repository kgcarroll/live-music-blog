/**
 * Resolve venue photos (Google Places + Ticketmaster fallback) and cache in Sanity.
 *
 *   npm run venue-image:sync
 *   npm run venue-image:sync -- --limit 20
 *   npm run venue-image:sync -- --force --limit 10
 */
import {loadTicketmasterFeedDirect} from '@/lib/ticketmaster'
import {syncVenueImagesOnFeed} from '@/lib/venueImageSync'

function parseArgs(argv: string[]): {force: boolean; limit?: number} {
  let force = false
  let limit: number | undefined
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') force = true
    if (arg === '--limit' && argv[i + 1]) {
      const n = Number(argv[++i])
      if (Number.isFinite(n) && n > 0) limit = Math.floor(n)
    }
  }
  return {force, limit}
}

async function main() {
  const {force, limit} = parseArgs(process.argv.slice(2))

  if (!process.env.SANITY_API_WRITE_TOKEN?.trim()) {
    console.error('SANITY_API_WRITE_TOKEN is required to write venueImage documents.')
    process.exit(1)
  }

  if (!process.env.GOOGLE_PLACES_API_KEY?.trim()) {
    console.error('GOOGLE_PLACES_API_KEY is not set.')
    process.exit(1)
  }

  console.log('Loading Ticketmaster feed…')
  const feed = await loadTicketmasterFeedDirect({
    skipSpotifySync: true,
    skipVenueImageSync: true,
  })
  if (feed.error) {
    console.error('Ticketmaster feed failed:', feed.error)
    process.exit(1)
  }

  console.log(`Feed has ${feed.venues.length} venues. Syncing…`)
  const result = await syncVenueImagesOnFeed(feed.venues, {force, maxVenues: limit})

  if (result.skippedNotConfigured) {
    console.error('Google Places is not configured.')
    process.exit(1)
  }

  if (result.venuesProcessed === 0) {
    console.log('Nothing to sync (all venues at current image version). Use --force to re-run.')
    process.exit(0)
  }

  console.log(
    `Done: ${result.venuesProcessed} venue(s) processed, ${result.imagesWritten} document(s) written.`,
  )
  console.log('Reload /venues to see cached images (feed applies cache on each load).')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
