'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

import type {HeaderLogo} from '@/lib/resolveHeaderLogo'
import {ReadProgressBar} from '@/components/ReadProgressBar'
import {SiteLogoMark} from '@/components/SiteLogoMark'
import {SpotifyIcon} from '@/components/SpotifyIcon'
import {useEffect, useRef, useState, useSyncExternalStore} from 'react'
import {createPortal} from 'react-dom'

const aboutLinks = [
  {href: '/about', label: 'About'},
  {href: '/contact', label: 'Contact'},
] as const

const aboutSubmenuLinks = [{href: '/contact', label: 'Contact'}] as const

function isNavLinkActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

const trailingNavLinks = [
  {href: '/events', label: 'Events'},
  {href: '/venues', label: 'Venues'},
] as const

const reviewsSubmenuLinks = [
  {href: '/news', label: 'News'},
  {href: '/interviews', label: 'Interviews'},
  {href: '/photos', label: 'Photos'},
] as const

function isReviewsSectionActive(pathname: string) {
  return (
    isNavLinkActive(pathname, '/reviews') ||
    reviewsSubmenuLinks.some((link) => isNavLinkActive(pathname, link.href))
  )
}

function isAboutSectionActive(pathname: string) {
  return pathname === '/about' || pathname === '/contact'
}

function isAboutCaretActive(pathname: string) {
  return pathname === '/contact'
}

function isReviewsCaretActive(pathname: string) {
  return reviewsSubmenuLinks.some((link) => isNavLinkActive(pathname, link.href))
}

/** Mobile menu keeps dropdown sections as separate top-level items. */
const mobileLinks = [
  {href: '/', label: 'Home'},
  ...aboutLinks,
  {href: '/reviews', label: 'Reviews'},
  ...reviewsSubmenuLinks,
  ...trailingNavLinks,
] as const

const navLinkClass =
  'text-zinc-300 transition-[opacity,color] duration-200'
const navLinkActiveClass = '!opacity-100 text-amber-200'

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
    <div className={`flex shrink-0 items-center gap-2 md:gap-1 ${className ?? ''}`}>
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

function IconChevronDown({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function NavSplitDropdown({
  pathname,
  href,
  label,
  menuId,
  menuAriaLabel,
  submenuLinks,
  isSectionActive,
  isCaretActive,
}: {
  pathname: string
  href: string
  label: string
  menuId: string
  menuAriaLabel: string
  submenuLinks: readonly {href: string; label: string}[]
  isSectionActive: (pathname: string) => boolean
  isCaretActive: (pathname: string) => boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{top: number; left: number} | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const sectionActive = isSectionActive(pathname)
  const caretActive = isCaretActive(pathname)

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const updateMenuPosition = () => {
    const root = rootRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
    })
  }

  const openMenu = () => {
    clearCloseTimer()
    updateMenuPosition()
    setOpen(true)
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  const dropdownMenu =
    mounted && open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={menuAriaLabel}
            style={{top: menuPosition.top, left: menuPosition.left}}
            className="fixed z-50 min-w-[10rem] transition-[opacity,visibility,transform] duration-200 visible translate-y-0 opacity-100"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <ul className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 py-1 shadow-lg shadow-black/40">
              {submenuLinks.map((link) => {
                const active = isNavLinkActive(pathname, link.href)
                return (
                  <li key={link.href} role="none">
                    <Link
                      href={link.href}
                      role="menuitem"
                      aria-current={active ? 'page' : undefined}
                      className={`block px-4 py-2 text-left text-sm font-medium uppercase tracking-wide text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-amber-200 ${
                        active ? 'text-amber-200' : ''
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div ref={rootRef} className="inline-flex items-center gap-0.5">
        <Link
          href={href}
          aria-current={isNavLinkActive(pathname, href) ? 'page' : undefined}
          className={`${navLinkClass} ${sectionActive ? navLinkActiveClass : ''}`}
        >
          {label}
        </Link>
        <button
          ref={buttonRef}
          type="button"
          className={`inline-flex items-center justify-center rounded-sm p-0.5 ${navLinkClass} ${
            caretActive ? navLinkActiveClass : ''
          }`}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={menuId}
          aria-label={`${label} menu`}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          onFocus={openMenu}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null
            if (menuRef.current?.contains(next) || rootRef.current?.contains(next)) return
            setOpen(false)
          }}
          onClick={() => {
            updateMenuPosition()
            setOpen((value) => !value)
          }}
        >
          <IconChevronDown className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {dropdownMenu}
    </>
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
            {mobileLinks.map((l) => {
              const active = isNavLinkActive(pathname, l.href)
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
            className={`flex flex-col overflow-hidden transition-[max-height,padding] duration-300 ease-out md:overflow-visible md:items-center md:gap-2 ${
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
            <div className="relative hidden w-full md:block md:py-1">
              <nav
                className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 px-[6.5rem] py-1 text-sm font-medium uppercase tracking-wide lg:gap-x-5 lg:px-28 [&:has(a:hover)_a]:opacity-35 [&:has(a:hover)_a:hover]:!opacity-100 [&:has(a:hover)_a:hover]:text-amber-200 [&:has(button:hover)_button]:opacity-35 [&:has(button:hover)_button:hover]:!opacity-100 [&:has(button:hover)_button:hover]:text-amber-200"
                aria-label="Main"
              >
                <Link
                  href="/"
                  aria-current={isNavLinkActive(pathname, '/') ? 'page' : undefined}
                  className={navLinkClass}
                >
                  Home
                </Link>
                <NavSplitDropdown
                  pathname={pathname}
                  href="/about"
                  label="About"
                  menuId="about-nav-menu"
                  menuAriaLabel="About"
                  submenuLinks={aboutSubmenuLinks}
                  isSectionActive={isAboutSectionActive}
                  isCaretActive={isAboutCaretActive}
                />
                <NavSplitDropdown
                  pathname={pathname}
                  href="/reviews"
                  label="Reviews"
                  menuId="reviews-nav-menu"
                  menuAriaLabel="Reviews"
                  submenuLinks={reviewsSubmenuLinks}
                  isSectionActive={isReviewsSectionActive}
                  isCaretActive={isReviewsCaretActive}
                />
                {trailingNavLinks.map((l) => {
                  const active = isNavLinkActive(pathname, l.href)
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={active ? 'page' : undefined}
                      className={navLinkClass}
                    >
                      {l.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                <HeaderAsideLinks
                  instagram={instagram}
                  spotify={spotify}
                  pathname={pathname}
                  className="pointer-events-auto shrink-0"
                />
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
