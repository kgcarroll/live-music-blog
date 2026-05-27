import type {ReactNode} from 'react'

import {SITE_STICKY_TOP_CLASS} from '@/lib/siteHeaderOffset'

/**
 * lg+: sticky map beside venue copy only; full-width block below (e.g. events grid).
 */
export function VenueDetailLayout({
  details,
  mapAside,
  mapMobile,
  below,
}: {
  details: ReactNode
  mapAside?: ReactNode
  mapMobile?: ReactNode
  below: ReactNode
}) {
  const hasMapAside = mapAside != null

  return (
    <article className="pb-16">
      {hasMapAside ? (
        <>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-stretch lg:gap-x-10">
            <div className="min-w-0">{details}</div>
            <div className="hidden min-w-0 lg:block">{mapAside}</div>
          </div>
          {mapMobile ? <div className="mt-8 lg:hidden">{mapMobile}</div> : null}
        </>
      ) : (
        details
      )}
      <div className="mt-12 w-full min-w-0">{below}</div>
    </article>
  )
}

export function VenueMapStickyAside({children}: {children: ReactNode}) {
  return (
    <aside className={`sticky z-10 ${SITE_STICKY_TOP_CLASS}`}>
      {children}
    </aside>
  )
}
