'use client'

import dynamic from 'next/dynamic'
import config from '../../../../sanity.config'

const NextStudio = dynamic(() => import('next-sanity/studio').then((mod) => mod.NextStudio), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      Loading Studio...
    </div>
  ),
})

export function StudioClient() {
  return <NextStudio config={config} />
}
