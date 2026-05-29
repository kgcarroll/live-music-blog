/**
 * Move eventArchive docs from dotted ids (auth-only) to hyphen ids (publicly readable).
 * Usage: node --env-file=.env.local --import tsx scripts/migrate-event-archive-ids.ts
 */
import {
  eventArchiveDocumentFromEvent,
  eventArchiveDocId,
  legacyEventArchiveDocId,
  scheduleEventFromArchive,
  type EventArchiveRecord,
} from '../src/lib/eventArchive'
import {getSanityWriteClient} from '../src/sanity/lib/writeClient'

async function main() {
  const writeClient = getSanityWriteClient()
  if (!writeClient) {
    throw new Error('SANITY_API_WRITE_TOKEN is not set')
  }

  const rows = await writeClient.withConfig({perspective: 'raw'}).fetch<
    (EventArchiveRecord & {_id: string})[]
  >(`*[_type == "eventArchive"]{
      _id,
      slug,
      eventId,
      name,
      venueId,
      venueName,
      venueSlug,
      venueCity,
      venueState,
      startDateTime,
      localDate,
      localTime,
      "ticketmasterUrl": ticketmasterUrl,
      imageUrl,
      lastSeenAt
    }`)

  console.log(`Found ${rows.length} eventArchive document(s) to inspect.`)

  let migrated = 0
  let deletedLegacy = 0

  for (const row of rows) {
    if (!row.slug || !row.eventId || !row.name) continue

    const newId = eventArchiveDocId(row.slug)
    const legacyId = legacyEventArchiveDocId(row.slug)
    const currentId = row._id

    if (currentId === newId) continue

    const event = scheduleEventFromArchive(row)
    const venueSlugById = new Map<string, string>()
    if (event.venueId && row.venueSlug) {
      venueSlugById.set(event.venueId, row.venueSlug)
    }

    const doc = eventArchiveDocumentFromEvent(
      event,
      event.venueId ? (venueSlugById.get(event.venueId) ?? null) : null,
      row.lastSeenAt ?? new Date().toISOString(),
    )

    await writeClient.createOrReplace({...doc, _id: newId})

    if (currentId && currentId !== newId) {
      await writeClient.delete(currentId)
      deletedLegacy += 1
    } else if (legacyId !== newId) {
      try {
        await writeClient.delete(legacyId)
        deletedLegacy += 1
      } catch {
        // legacy doc may not exist
      }
    }

    migrated += 1
    console.log(`  ${row.slug}`)
  }

  console.log(`Migrated ${migrated} archive(s), removed ${deletedLegacy} legacy id(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
