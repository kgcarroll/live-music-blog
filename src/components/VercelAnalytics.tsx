'use client'

import {Analytics, type BeforeSend, type BeforeSendEvent} from '@vercel/analytics/react'
import {SpeedInsights} from '@vercel/speed-insights/next'

const beforeSend: BeforeSend = (event: BeforeSendEvent) => {
  try {
    const path = new URL(event.url).pathname
    if (path.startsWith('/studio') || path.startsWith('/api')) return null
  } catch {
    return event
  }
  return event
}

export function VercelAnalytics() {
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <SpeedInsights />
    </>
  )
}
