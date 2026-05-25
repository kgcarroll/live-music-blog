import Link from 'next/link'

import {NewsletterSignup} from '@/components/NewsletterSignup'
import {SiteLogoMark} from '@/components/SiteLogoMark'
import {SocialMediaLinks, type SocialLinks} from '@/components/SocialMediaLinks'
import type {HeaderLogo} from '@/lib/resolveHeaderLogo'

const footerLinks = [
  {href: '/', label: 'Home'},
  {href: '/about', label: 'About'},
  {href: '/contact', label: 'Contact'},
  {href: '/newsletter', label: 'Newsletter'},
  {href: '/reviews', label: 'Reviews'},
  {href: '/news', label: 'News'},
  {href: '/interviews', label: 'Interviews'},
  {href: '/events', label: 'Events'},
  {href: '/venues', label: 'Venues'},
  {href: '/search', label: 'Search'},
] as const

const footerLinkClass =
  'text-zinc-400 transition-colors hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm'

const SITE_URL = 'https://philadelphiamusic.live'

export function SiteFooter({
  logo,
  siteTitle,
  social,
}: {
  logo: HeaderLogo | null
  siteTitle: string
  social: SocialLinks
}) {
  return (
    <footer className="mt-auto border-t border-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs uppercase tracking-wide">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footerLinkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 flex flex-col gap-10 border-t border-zinc-800 pt-8 md:flex-row md:items-start md:justify-between md:gap-12">
          <div className="hidden flex-col gap-2 md:flex">
            <SocialMediaLinks
              instagram={social.instagram}
              facebook={social.facebook}
              spotify={social.spotify}
            />
            <Link
              href="/"
              className="inline-flex shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm"
            >
              <SiteLogoMark
                logo={logo}
                siteTitle={siteTitle}
                className="h-12 w-auto max-w-[min(100%,16rem)] object-left md:h-14 md:max-w-[18rem]"
              />
            </Link>
          </div>
          <NewsletterSignup variant="footer" />
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Copyright {new Date().getFullYear()}{' '}
          <a
            href={SITE_URL}
            className="transition-colors hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm"
          >
            philadelphiamusic.live
          </a>
        </p>
      </div>
    </footer>
  )
}
