'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useEffect, useState, useSyncExternalStore} from 'react'
import {createPortal} from 'react-dom'

const links = [
  {href: '/', label: 'Home'},
  {href: '/about', label: 'About'},
  {href: '/contact', label: 'Contact'},
  {href: '/interviews', label: 'Interviews'},
  {href: '/news', label: 'News'},
  {href: '/photos', label: 'Photos'},
  {href: '/reviews', label: 'Reviews'},
  {href: '/authors', label: 'Authors'},
]

/** Tailwind `md` breakpoint — mobile menu only mounts below this width. */
const MOBILE_NAV_MQ = '(max-width: 767px)'

function subscribeMobileNavMq(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(MOBILE_NAV_MQ)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getMobileNavMqSnapshot() {
  return window.matchMedia(MOBILE_NAV_MQ).matches
}

function getServerMobileNavMqSnapshot() {
  return false
}

function IconInstagram({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconSpotify({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.52 17.35c-.24.38-.75.5-1.13.26-3.09-1.78-6.98-2.18-11.59-1.19-.44.1-.89-.17-1-.61-.1-.45.17-.9.61-1 5.04-1.08 9.36-.65 12.72 1.31.38.22.5.75.29 1.23zm1.47-3.49c-.3.48-.94.63-1.42.33-3.54-2.06-8.93-2.67-13.1-1.46-.55.17-1.13-.13-1.3-.68-.17-.55.13-1.13.68-1.3 4.69-1.43 10.55-.78 14.48 1.57.48.28.63.94.34 1.42zm.17-3.7c-4.25-2.52-11.28-2.75-15.38-1.52-.65.2-1.34-.17-1.54-.82-.2-.65.17-1.34.82-1.54 4.47-1.35 12.09-1.09 16.98 1.75.58.34.77 1.1.43 1.68-.34.57-1.1.76-1.68.42z" />
    </svg>
  )
}

function IconSearch({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

const asideIconLinkClass =
  'group inline-flex h-9 w-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'
const asideIconClass =
  'text-zinc-400 transition-colors duration-200 group-hover:text-amber-200 group-focus-visible:text-amber-200'

/** Social links and search icon (search is always shown). */
function HeaderAsideLinks({
  instagram,
  spotify,
  pathname,
  className,
  onNavigate,
}: {
  instagram: string | null
  spotify: string | null
  pathname: string
  className?: string
  onNavigate?: () => void
}) {
  return (
    <div className={`flex shrink-0 items-center gap-2 ${className ?? ''}`}>
      {instagram ? (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          className={asideIconLinkClass}
          aria-label="Instagram (opens in a new tab)"
        >
          <IconInstagram className={asideIconClass} />
        </a>
      ) : null}
      {spotify ? (
        <a
          href={spotify}
          target="_blank"
          rel="noopener noreferrer"
          className={asideIconLinkClass}
          aria-label="Spotify (opens in a new tab)"
        >
          <IconSpotify className={asideIconClass} />
        </a>
      ) : null}
      <Link
        href="/search"
        className={asideIconLinkClass}
        aria-label="Search"
        aria-current={pathname === '/search' ? 'page' : undefined}
        onClick={onNavigate}
      >
        <IconSearch className={asideIconClass} />
      </Link>
    </div>
  )
}

export function SiteHeader({
  social,
}: {
  social: {instagram: string | null; spotify: string | null}
}) {
  const {instagram, spotify} = social
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const isMobileLayout = useSyncExternalStore(
    subscribeMobileNavMq,
    getMobileNavMqSnapshot,
    getServerMobileNavMqSnapshot,
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileLayout) setOpen(false)
  }, [isMobileLayout])

  useEffect(() => {
    if (!open || !isMobileLayout) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isMobileLayout])

  useEffect(() => {
    if (!open || !isMobileLayout) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isMobileLayout])

  const mobileMenu =
    mounted && open && isMobileLayout ? (
      <div
        className="fixed inset-0 z-[100] flex flex-col bg-zinc-950"
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex shrink-0 justify-center border-b border-zinc-800">
          <div className="flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="min-w-0 flex-1 pr-3 text-left text-xl font-semibold leading-tight tracking-tight text-zinc-50"
              onClick={() => setOpen(false)}
            >
              Live Music Blog
            </Link>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-600 p-2 text-zinc-100"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <nav
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-8"
          aria-label="Mobile main"
        >
          <ul className="group/mnav flex flex-col">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <li key={l.href} className="border-b border-zinc-800/90">
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className="block py-4 text-lg font-medium tracking-tight text-zinc-100 transition-[opacity,color] duration-200 group-hover/mnav:opacity-35 group-hover/mnav:hover:!opacity-100 group-hover/mnav:hover:text-amber-200"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex shrink-0 justify-center border-t border-zinc-800 px-4 py-4">
          <div className="flex w-full max-w-6xl justify-end">
            <HeaderAsideLinks
              instagram={instagram}
              spotify={spotify}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      </div>
    ) : null

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:items-center md:gap-2 md:pb-4 md:pt-4">
            <div className="flex w-full min-h-11 items-center justify-between py-3 md:min-h-0 md:justify-center md:py-0">
              <Link
                href="/"
                className="min-w-0 flex-1 pr-3 text-left text-xl font-semibold leading-tight tracking-tight text-zinc-50 md:flex-none md:pr-0 md:text-center md:text-2xl"
              >
                Live Music Blog
              </Link>
              <div className="flex shrink-0 items-center gap-2 md:hidden">
                <HeaderAsideLinks instagram={instagram} spotify={spotify} pathname={pathname} />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-zinc-700 p-2 text-zinc-100"
                  aria-expanded={open}
                  aria-controls="mobile-nav"
                  onClick={() => setOpen((v) => !v)}
                >
                  <span className="sr-only">Menu</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7H20M4 12H20M4 17H20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="hidden w-full md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-x-4 md:py-1">
              <div className="min-w-0" aria-hidden="true" />
              <nav
                className="group/mainnav flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-1 text-sm font-medium transition-opacity duration-200 lg:gap-x-10"
                aria-label="Main"
              >
                {links.map((l) => {
                  const active = pathname === l.href
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={active ? 'page' : undefined}
                      className="text-zinc-300 transition-[opacity,color] duration-200 group-hover/mainnav:opacity-35 group-hover/mainnav:hover:!opacity-100 group-hover/mainnav:hover:text-amber-200"
                    >
                      {l.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="flex min-w-0 items-center justify-end">
                <HeaderAsideLinks instagram={instagram} spotify={spotify} pathname={pathname} />
              </div>
            </div>
          </div>
        </div>
      </header>
      {mobileMenu ? createPortal(mobileMenu, document.body) : null}
    </>
  )
}
