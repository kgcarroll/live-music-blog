'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

import type {HeaderLogo} from '@/lib/resolveHeaderLogo'
import {ReadProgressBar} from '@/components/ReadProgressBar'
import {SiteLogoMark} from '@/components/SiteLogoMark'
import {SpotifyIcon} from '@/components/SpotifyIcon'
import {useEffect, useRef, useState, useSyncExternalStore} from 'react'
import {createPortal} from 'react-dom'

const links = [
  {href: '/', label: 'Home'},
  {href: '/about', label: 'About'},
  {href: '/contact', label: 'Contact'},
  {href: '/interviews', label: 'Interviews'},
  {href: '/news', label: 'News'},
  {href: '/photos', label: 'Photos'},
  {href: '/reviews', label: 'Reviews'},
]

/** Tailwind `md` breakpoint — mobile menu only mounts below this width. */
const MOBILE_NAV_MQ = '(max-width: 767px)'
const LOGO_HIDE_SCROLL_Y = 140
const LOGO_SHOW_SCROLL_Y = 48

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
          <SpotifyIcon className={`${asideIconClass} size-5`} />
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
  logo,
  siteTitle,
}: {
  social: {instagram: string | null; spotify: string | null}
  logo: HeaderLogo | null
  siteTitle: string
}) {
  const {instagram, spotify} = social
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showLogo, setShowLogo] = useState(true)
  const lastScrollY = useRef(0)
  const showLogoRef = useRef(true)
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
    lastScrollY.current = window.scrollY

    const updateLogoVisibility = (next: boolean) => {
      if (showLogoRef.current === next) return
      showLogoRef.current = next
      setShowLogo(next)
    }

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY.current

      if (y <= LOGO_SHOW_SCROLL_Y) {
        updateLogoVisibility(true)
      } else if (delta < 0) {
        updateLogoVisibility(true)
      } else if (y >= LOGO_HIDE_SCROLL_Y && delta > 0) {
        updateLogoVisibility(false)
      }

      lastScrollY.current = y
    }

    window.addEventListener('scroll', onScroll, {passive: true})
    return () => window.removeEventListener('scroll', onScroll)
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
              className="min-w-0 flex-1 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              onClick={() => setOpen(false)}
            >
              <SiteLogoMark logo={logo} siteTitle={siteTitle} />
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
          <ul className="flex flex-col [&:has(a:hover)_a]:opacity-35 [&:has(a:hover)_a:hover]:!opacity-100 [&:has(a:hover)_a:hover]:text-amber-200">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <li key={l.href} className="border-b border-zinc-800/90">
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className="block py-4 text-lg font-medium tracking-tight text-zinc-100 transition-[opacity,color] duration-200"
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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div
            className={`flex flex-col overflow-hidden transition-[max-height,padding] duration-300 ease-out md:items-center md:gap-2 ${
              showLogo ? 'max-h-24 md:max-h-36 md:pb-4 md:pt-4' : 'max-h-24 md:max-h-20 md:pb-8 md:pt-3'
            }`}
          >
            <div
              className={`w-full transition-[grid-template-rows,opacity,transform] duration-300 ease-out md:grid ${
                showLogo
                  ? 'md:grid-rows-[1fr] md:opacity-100 md:translate-y-0'
                  : 'md:grid-rows-[0fr] md:opacity-0 md:-translate-y-2 md:pointer-events-none'
              }`}
            >
              <div className="flex w-full min-h-11 items-center justify-between py-3 md:min-h-0 md:overflow-hidden md:justify-center md:py-0">
                <Link
                  href="/"
                  className={`min-w-0 flex-1 pr-3 text-left outline-none transition-[opacity,transform] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-amber-400/50 md:flex-none md:pr-0 md:text-center ${
                    showLogo ? 'md:opacity-100 md:translate-y-0' : 'md:opacity-0 md:-translate-y-2 md:pointer-events-none'
                  }`}
                  aria-hidden={!showLogo && !isMobileLayout}
                  tabIndex={!showLogo && !isMobileLayout ? -1 : undefined}
                >
                  <SiteLogoMark logo={logo} siteTitle={siteTitle} />
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
            </div>
            <div className="hidden w-full md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(max-content,1fr)] md:items-center md:gap-x-3 md:py-1">
              <div className="min-w-0" aria-hidden="true" />
              <nav
                className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 py-1 text-sm font-medium uppercase tracking-wide lg:gap-x-8 [&:has(a:hover)_a]:opacity-35 [&:has(a:hover)_a:hover]:!opacity-100 [&:has(a:hover)_a:hover]:text-amber-200"
                aria-label="Main"
              >
                {links.map((l) => {
                  const active = pathname === l.href
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={active ? 'page' : undefined}
                      className="text-zinc-300 transition-[opacity,color] duration-200"
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
        <ReadProgressBar />
      </header>
      <div className="h-[92px] md:h-[136px]" aria-hidden="true" />
      {mobileMenu ? createPortal(mobileMenu, document.body) : null}
    </>
  )
}
