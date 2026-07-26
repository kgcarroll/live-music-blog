/**
 * One-venue proof: Ticketmaster identity → Google Places photo.
 * Does not write to Sanity or change the live site.
 *
 *   npm run venue-image:spike
 *   npm run venue-image:spike -- --slug union-transfer
 *   npm run venue-image:spike -- --list
 */
import {
  GOOGLE_PLACE_MATCH_THRESHOLD,
  isGooglePlacesConfigured,
  matchVenueToGooglePlace,
  type GooglePlaceCandidate,
  type TicketmasterVenueIdentity,
} from '@/lib/googlePlaces'
import {
  fetchVenueById,
  loadTicketmasterFeedDirect,
  type VenueMapPin,
} from '@/lib/ticketmaster'

function parseArgs(argv: string[]): {slug?: string; list: boolean} {
  let slug: string | undefined
  let list = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--list') list = true
    if (arg === '--slug' && argv[i + 1]) slug = argv[++i]
  }
  return {slug, list}
}

function formatDistance(meters: number | null): string {
  if (meters == null) return 'unknown'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2)} km`
}

function printCandidate(label: string, c: GooglePlaceCandidate): void {
  console.log(`  ${label}: ${c.displayName}`)
  console.log(`    placeId: ${c.placeId}`)
  console.log(`    score: ${c.matchScore} (threshold ${GOOGLE_PLACE_MATCH_THRESHOLD})`)
  console.log(`    distance: ${formatDistance(c.distanceMeters)}`)
  console.log(`    address: ${c.formattedAddress ?? '—'}`)
  console.log(`    types: ${c.types.slice(0, 5).join(', ') || '—'}`)
  console.log(`    photos: ${c.photoCount}`)
  if (c.photoAttributions.length) {
    console.log(`    attribution: ${c.photoAttributions.join(', ')}`)
  }
}

async function resolveVenuePin(
  slug: string | undefined,
  venues: VenueMapPin[],
): Promise<VenueMapPin | null> {
  if (!venues.length) return null
  if (slug) {
    const match = venues.find((v) => v.slug === slug)
    return match ?? null
  }
  const preferred = venues.find((v) => v.slug.includes('union-transfer'))
  return preferred ?? venues[0]!
}

async function main() {
  const {slug, list} = parseArgs(process.argv.slice(2))

  if (!process.env.TICKETMASTER_API_KEY?.trim()) {
    console.error('TICKETMASTER_API_KEY is not set in .env.local')
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

  if (list) {
    console.log(`\n${feed.venues.length} venues in feed:\n`)
    for (const v of feed.venues.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  ${v.slug.padEnd(36)} ${v.name}`)
    }
    process.exit(0)
  }

  if (!isGooglePlacesConfigured()) {
    console.error('GOOGLE_PLACES_API_KEY is not set in .env.local')
    console.error('Enable Places API (New) in Google Cloud, then add the key.')
    process.exit(1)
  }

  const pin = await resolveVenuePin(slug, feed.venues)
  if (!pin) {
    console.error(
      slug
        ? `No venue with slug "${slug}" in the current feed. Try: npm run venue-image:spike -- --list`
        : 'No venues in feed.',
    )
    process.exit(1)
  }

  console.log(`\nTicketmaster venue: ${pin.name}`)
  console.log(`  id: ${pin.id}`)
  console.log(`  slug: ${pin.slug}`)
  console.log(`  coords: ${pin.latitude}, ${pin.longitude}`)

  const detail = await fetchVenueById(pin.id)
  if (detail && detail !== 'not_configured' && detail !== 'api_error') {
    console.log(`  address: ${[detail.addressLine1, detail.city, detail.state, detail.postalCode].filter(Boolean).join(', ')}`)
    if (detail.imageUrl) {
      console.log(`  TM image: ${detail.imageUrl}`)
    }
  }

  const identity: TicketmasterVenueIdentity = {
    id: pin.id,
    name: pin.name,
    addressLine1: detail && detail !== 'not_configured' && detail !== 'api_error' ? detail.addressLine1 : null,
    city: pin.city ?? (detail && detail !== 'not_configured' && detail !== 'api_error' ? detail.city : null),
    state: pin.state ?? (detail && detail !== 'not_configured' && detail !== 'api_error' ? detail.state : null),
    postalCode: detail && detail !== 'not_configured' && detail !== 'api_error' ? detail.postalCode : null,
    latitude: pin.latitude,
    longitude: pin.longitude,
  }

  console.log('\nSearching Google Places…')
  const result = await matchVenueToGooglePlace(identity)

  if (result.status === 'matched') {
    console.log('\n✓ Match found\n')
    printCandidate('Winner', result.candidate)
    console.log(`\n  photoName: ${result.photoName}`)
    console.log('\nSpike succeeded — safe to proceed with Sanity cache + sync.')
    return
  }

  console.log(`\n✗ No match (${result.status})`)
  if (result.message) console.log(`  ${result.message}`)

  const candidates = result.candidates ?? []
  if (candidates.length) {
    console.log('\nCandidates scored:')
    candidates.forEach((c, i) => printCandidate(`#${i + 1}`, c))
  }

  console.log(
    '\nTry another venue: npm run venue-image:spike -- --slug <slug-from-list>',
  )
  process.exit(result.status === 'api_error' ? 2 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
