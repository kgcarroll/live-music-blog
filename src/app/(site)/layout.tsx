import {SkipLink} from '@/components/SkipLink'
import {SiteFooter} from '@/components/SiteFooter'
import {SiteHeader} from '@/components/SiteHeader'
import {resolveHeaderLogo, type SanitySettingsLogo} from '@/lib/resolveHeaderLogo'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

export const revalidate = 60

type SiteSettingsForHeader = {
  siteTitle?: string | null
  logo?: SanitySettingsLogo
  instagramUrl?: string | null
  facebookUrl?: string | null
  spotifyUrl?: string | null
} | null

export default async function SiteLayout({children}: {children: React.ReactNode}) {
  const {data} = await sanityFetch({query: SITE_SETTINGS, stega: false})
  const s = (data ?? null) as SiteSettingsForHeader
  const siteTitle = s?.siteTitle?.trim() || 'Live Music Blog'
  const social = {
    instagram: s?.instagramUrl ?? null,
    facebook: s?.facebookUrl ?? null,
    spotify: s?.spotifyUrl ?? null,
  }
  const logo = resolveHeaderLogo(s?.logo ?? null, siteTitle)

  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />
      <SiteHeader social={social} logo={logo} siteTitle={siteTitle} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {children}
      </main>
      <SiteFooter logo={logo} siteTitle={siteTitle} social={social} />
    </div>
  )
}
