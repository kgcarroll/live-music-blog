import type {Metadata} from 'next'
import {ArticleBody} from '@/components/ArticleBody'
import {ContactForm} from '@/components/ContactForm'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Contact',
}

export default async function ContactPage() {
  const {data} = await sanityFetch({query: SITE_SETTINGS, stega: false})

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-zinc-50">Contact</h1>
      {data?.contactPortable?.length ? (
        <div className="mt-6">
          <ArticleBody value={data.contactPortable} />
        </div>
      ) : (
        <p className="mt-4 text-zinc-400">
          Pitch a show, send photos, or ask about coverage. Use the form below—we read every message.
        </p>
      )}
      <div className="mt-10">
        <ContactForm />
      </div>
    </div>
  )
}
