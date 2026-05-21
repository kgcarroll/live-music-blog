import Link from 'next/link'

const footerLinks = [
  {href: '/', label: 'Home'},
  {href: '/interviews', label: 'Interviews'},
  {href: '/news', label: 'News'},
  {href: '/photos', label: 'Photos'},
  {href: '/reviews', label: 'Reviews'},
  {href: '/about', label: 'About'},
  {href: '/contact', label: 'Contact'},
  {href: '/search', label: 'Search'},
] as const

const footerLinkClass =
  'text-zinc-400 transition-colors hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm'

const SITE_URL = 'https://philadelphiamusic.live'

export function SiteFooter() {
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
