'use client'

import Link from 'next/link'
import {useIsPresentationTool} from 'next-sanity/hooks'

export function DisableDraftMode() {
  const isPresentationTool = useIsPresentationTool()
  if (isPresentationTool) return null
  return (
    <Link
      href="/api/draft-mode/disable"
      prefetch={false}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 shadow-lg ring-1 ring-zinc-900/10 hover:bg-white"
    >
      Exit preview
    </Link>
  )
}
