import {Inter} from 'next/font/google'
import type {Metadata} from 'next'
import {Suspense} from 'react'
import {draftMode} from 'next/headers'
import {VisualEditing} from 'next-sanity/visual-editing'
import {SanityLive, sanityFetch} from '@/sanity/lib/live'
import {DisableDraftMode} from '@/components/DisableDraftMode'
import {VercelAnalytics} from '@/components/VercelAnalytics'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {urlForImage} from '@/sanity/lib/image'
import {SITE_SETTINGS} from '@/sanity/lib/queries'
import './globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-sans'})

type SiteSettingsMetadata = {
  favicon?: {
    asset?: {
      _id?: string
    } | null
  } | null
} | null

function faviconUrl(favicon: NonNullable<SiteSettingsMetadata>['favicon'], size: number) {
  if (!favicon?.asset?._id) return null
  return urlForImage(favicon as never).width(size).height(size).fit('crop').format('png').url()
}

export async function generateMetadata(): Promise<Metadata> {
  const {data} = await sanityFetch({query: SITE_SETTINGS, stega: false})
  const settings = (data ?? null) as SiteSettingsMetadata
  const icon32 = faviconUrl(settings?.favicon ?? null, 32)
  const icon192 = faviconUrl(settings?.favicon ?? null, 192)
  const appleIcon = faviconUrl(settings?.favicon ?? null, 180)

  return {
    title: {
      default: 'Live Music Blog',
      template: '%s | Live Music Blog',
    },
    description: 'Live music interviews, news, and reviews.',
    alternates: {
      types: {
        'application/rss+xml': [{url: absoluteSiteUrl('/feed.xml'), title: 'RSS Feed'}],
      },
    },
    icons: {
      icon: [
        ...(icon32 ? [{url: icon32, sizes: '32x32', type: 'image/png'}] : []),
        ...(icon192 ? [{url: icon192, sizes: '192x192', type: 'image/png'}] : []),
      ],
      apple: appleIcon ? [{url: appleIcon, sizes: '180x180', type: 'image/png'}] : undefined,
    },
  }
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const draft = await draftMode()
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta
          name="impact-site-verification"
          {...({value: 'b3561db6-112d-4a2b-951c-4faa61a53f4d'} as Record<string, string>)}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-zinc-950 font-sans">
        {/* SanityLive uses dynamic(ssr:false); Suspense avoids a misleading dev overlay. */}
        <Suspense fallback={null}>
          <SanityLive />
        </Suspense>
        {children}
        {draft.isEnabled ? (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        ) : null}
        <VercelAnalytics />
      </body>
    </html>
  )
}
