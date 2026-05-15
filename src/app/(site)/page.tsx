import {HomeEditorialFeed} from '@/components/HomeEditorialFeed'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_EDITORIAL_PAGE} from '@/sanity/lib/queries'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'

/** Fresher home page when you publish in Studio (layout still uses 60s elsewhere). */
export const revalidate = 30

export default async function HomePage() {
  const {data: editorial} = await sanityFetch({
    query: HOME_EDITORIAL_PAGE,
    params: {start: 0, end: HOME_EDITORIAL_PAGE_SIZE},
  })
  const initialItems = (editorial ?? []) as EditorialCardItem[]

  return (
    <div>
      <section className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">The latest from the pit.</h1>
        <p className="mt-3 text-balance text-zinc-400">Interviews, news, photo galleries, and reviews.</p>
      </section>
      <HomeEditorialFeed initialItems={initialItems} />
    </div>
  )
}
