import {SkipLink} from '@/components/SkipLink'
import {SiteHeader} from '@/components/SiteHeader'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const revalidate = 60

type SiteSettingsForHeader = {
  instagramUrl?: string | null
  spotifyUrl?: string | null
} | null

export default async function SiteLayout({children}: {children: React.ReactNode}) {
  const {data} = await sanityFetch({query: SITE_SETTINGS, stega: false})
  const s = (data ?? null) as SiteSettingsForHeader
  const social = {
    instagram: s?.instagramUrl ?? null,
    spotify: s?.spotifyUrl ?? null,
  }

  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />
      <SiteHeader social={social} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {children}
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        Copyright {new Date().getFullYear()} Live Music Blog
      </footer>
    </div>
  )
}
