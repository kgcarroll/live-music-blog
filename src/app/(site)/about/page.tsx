import type {Metadata} from 'next'
import {ArticleBody} from '@/components/ArticleBody'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'About',
}

export default async function AboutPage() {
  const {data} = await sanityFetch({query: SITE_SETTINGS, stega: false})

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-zinc-50">About</h1>
      <p className="mt-4 text-zinc-400">
        We cover live music in the Philly area and beyond—photos from the rail, long-form interviews, and honest reviews.
      </p>
      {data?.aboutPortable?.length ? (
        <div className="mt-10">
          <ArticleBody value={data.aboutPortable} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">
          Optional: create a <strong>Site settings</strong> document in Sanity and add an About body to edit this
          section without a deploy.
        </p>
      )}
    </div>
  )
}
