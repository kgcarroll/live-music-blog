import Image from 'next/image'

import type {HeaderLogo} from '@/lib/resolveHeaderLogo'

type SiteLogoMarkProps = {
  logo: HeaderLogo | null
  siteTitle: string
  className?: string
}

/** Header brand: CMS logo when set, otherwise site title text. */
export function SiteLogoMark({logo, siteTitle, className}: SiteLogoMarkProps) {
  if (logo) {
    return (
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        className={`h-[54px] w-auto max-w-[min(100%,24rem)] object-contain object-left md:h-[66px] md:max-w-[30rem] md:object-center ${className ?? ''}`}
        placeholder={logo.lqip ? 'blur' : 'empty'}
        blurDataURL={logo.lqip ?? undefined}
        priority
      />
    )
  }

  return (
    <span
      className={`text-xl font-semibold leading-tight tracking-tight text-zinc-50 md:text-2xl ${className ?? ''}`}
    >
      {siteTitle}
    </span>
  )
}
