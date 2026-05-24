import {FacebookIcon} from '@/components/FacebookIcon'
import {SpotifyIcon} from '@/components/SpotifyIcon'

export const socialIconLinkClass =
  'group inline-flex h-9 w-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'

export const socialIconClass =
  'text-zinc-400 transition-colors duration-200 group-hover:text-amber-200 group-focus-visible:text-amber-200'

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

export type SocialLinks = {
  instagram: string | null
  facebook: string | null
  spotify: string | null
}

export function SocialMediaLinks({
  instagram,
  facebook,
  spotify,
  className,
}: SocialLinks & {className?: string}) {
  if (!instagram && !facebook && !spotify) return null

  return (
    <div className={`flex shrink-0 items-center gap-2 md:gap-1 ${className ?? ''}`}>
      {instagram ? (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          className={socialIconLinkClass}
          aria-label="Instagram (opens in a new tab)"
        >
          <IconInstagram className={socialIconClass} />
        </a>
      ) : null}
      {facebook ? (
        <a
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          className={socialIconLinkClass}
          aria-label="Facebook (opens in a new tab)"
        >
          <FacebookIcon className={`${socialIconClass} size-5`} />
        </a>
      ) : null}
      {spotify ? (
        <a
          href={spotify}
          target="_blank"
          rel="noopener noreferrer"
          className={socialIconLinkClass}
          aria-label="Spotify (opens in a new tab)"
        >
          <SpotifyIcon className={`${socialIconClass} size-5`} />
        </a>
      ) : null}
    </div>
  )
}
