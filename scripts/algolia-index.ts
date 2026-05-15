import {runFullEditorialAlgoliaReindex} from '../src/lib/algolia/reindexEditorialAlgolia'

async function main() {
  console.log('Fetching from Sanity and pushing to Algolia…')
  const {count} = await runFullEditorialAlgoliaReindex()
  console.log(`Done. Indexed ${count} records.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
