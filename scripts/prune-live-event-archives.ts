/**
 * Delete eventArchive docs for concerts still in the live Ticketmaster feed.
 * Usage: node --env-file=.env.local --import tsx scripts/prune-live-event-archives.ts
 */
import {
  deleteEventArchivesForLiveSlugs,
  resolveLiveEventSlugsForPrune,
} from '../src/lib/eventArchiveSync'

async function main() {
  const {slugs: liveSlugs, source} = await resolveLiveEventSlugsForPrune()

  if (source === 'snapshot') {
    console.warn(
      `Ticketmaster API unavailable or empty; using ${liveSlugs.length} slug(s) from Site Settings feed snapshot.`,
    )
  } else {
    console.log(`Live feed has ${liveSlugs.length} event(s) (Ticketmaster).`)
  }

  console.log('Pruning matching archives…')
  const pruned = await deleteEventArchivesForLiveSlugs(liveSlugs)
  console.log(`Removed ${pruned} eventArchive document(s) for still-active concerts.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
