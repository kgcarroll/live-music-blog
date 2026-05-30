/**
 * Enrich existing eventArchive docs with lineup and detail fields from Ticketmaster.
 * Usage: node --env-file=.env.local --import tsx scripts/enrich-event-archives.ts [--limit N] [--force]
 */
import {eventArchiveDocumentFromDetail, hasRichArchiveData, type EventArchiveRecord} from '../src/lib/eventArchive'
import {fetchEventDetailById} from '../src/lib/ticketmaster'
import {getSanityWriteClient} from '../src/sanity/lib/writeClient'

type ArchiveRow = Pick<EventArchiveRecord, 'slug' | 'eventId' | 'name' | 'venueSlug'> & {
  _id: string
  attractions?: EventArchiveRecord['attractions']
  info?: EventArchiveRecord['info']
  description?: EventArchiveRecord['description']
  pleaseNote?: EventArchiveRecord['pleaseNote']
  genreLabels?: EventArchiveRecord['genreLabels']
}

const ARCHIVE_QUERY = `*[_type == "eventArchive"] | order(lastSeenAt desc) {
  _id,
  slug,
  eventId,
  name,
  venueSlug,
  attractions,
  info,
  description,
  pleaseNote,
  genreLabels
}`

function parseArgs() {
  const args = process.argv.slice(2)
  let limit = Infinity
  let force = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1]!, 10)
      i += 1
    } else if (args[i] === '--force') {
      force = true
    }
  }

  return {limit, force}
}

async function main() {
  const {limit, force} = parseArgs()
  const writeClient = getSanityWriteClient()
  if (!writeClient) {
    throw new Error('SANITY_API_WRITE_TOKEN is not set')
  }

  const rows = await writeClient.fetch<ArchiveRow[]>(ARCHIVE_QUERY)
  const candidates = force
    ? rows
    : rows.filter((row) => !hasRichArchiveData(row))

  const toProcess = Number.isFinite(limit) ? candidates.slice(0, limit) : candidates
  if (!toProcess.length) {
    console.info('[event-archive:enrich] No archives need enrichment.')
    return
  }

  console.info(`[event-archive:enrich] Enriching ${toProcess.length} archive(s)...`)

  let enriched = 0
  let skipped = 0
  let failed = 0

  for (const row of toProcess) {
    const detail = await fetchEventDetailById(row.eventId)
    if (detail === 'not_configured') {
      throw new Error('TICKETMASTER_API_KEY is not set')
    }
    if (detail === 'api_error' || !detail) {
      console.warn(`[event-archive:enrich] Skipped ${row.slug}: Ticketmaster detail unavailable`)
      skipped += 1
      continue
    }

    const doc = eventArchiveDocumentFromDetail(
      {...detail, slug: row.slug},
      row.venueSlug ?? null,
    )

    try {
      await writeClient.createOrReplace(doc)
      enriched += 1
      console.info(`[event-archive:enrich] ${row.slug}`)
    } catch (error) {
      failed += 1
      console.warn(`[event-archive:enrich] Failed ${row.slug}:`, error)
    }

    await new Promise((resolve) => setTimeout(resolve, 120))
  }

  console.info(
    `[event-archive:enrich] Done. enriched=${enriched}, skipped=${skipped}, failed=${failed}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
