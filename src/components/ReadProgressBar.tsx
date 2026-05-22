'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useState} from 'react'

import {isArticlePath} from '@/lib/paths'

function getScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  if (scrollable <= 0) return 0
  return Math.min(1, Math.max(0, window.scrollY / scrollable))
}

export function ReadProgressBar() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const show = isArticlePath(pathname)

  useEffect(() => {
    if (!show) return
    const update = () => setProgress(getScrollProgress())
    update()
    window.addEventListener('scroll', update, {passive: true})
    window.addEventListener('resize', update, {passive: true})
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [pathname, show])

  if (!show) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="h-full w-full origin-left bg-amber-400/90 transition-transform duration-75 ease-out"
        style={{transform: `scaleX(${progress})`}}
      />
    </div>
  )
}
