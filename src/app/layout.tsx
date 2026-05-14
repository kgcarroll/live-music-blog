import {Inter} from 'next/font/google'
import type {Metadata} from 'next'
import {Suspense} from 'react'
import {draftMode} from 'next/headers'
import {VisualEditing} from 'next-sanity/visual-editing'
import {SanityLive} from '@/sanity/lib/live'
import {DisableDraftMode} from '@/components/DisableDraftMode'
import './globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-sans'})

export const metadata: Metadata = {
  title: {
    default: 'Live Music Blog',
    template: '%s | Live Music Blog',
  },
  description: 'Live music interviews, photos, and reviews.',
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const draft = await draftMode()
  return (
    <html lang="en" className={inter.variable}>
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
      </body>
    </html>
  )
}
