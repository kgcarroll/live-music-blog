import type {Metadata} from 'next'

import {buildPageMetadata, ogImageFromSiteSettings, type SiteSettingsOgImage} from '@/lib/pageMetadata'
import {normalizeDescription, plainTextFromPortableText} from '@/lib/portableTextPlain'
import {sanityFetch} from '@/sanity/lib/live'
import {SITE_SETTINGS} from '@/sanity/lib/queries'

type HubIntroKey =
  | 'interviewsHubPortable'
  | 'newsHubPortable'
  | 'reviewsHubPortable'
  | 'authorsHubPortable'
  | 'tagsHubPortable'
  | 'scheduleHubPortable'
  | 'venuesHubPortable'

export async function buildHubPageMetadata({
  title,
  path,
  introKey,
  fallbackDescription,
}: {
  title: string
  path: string
  introKey: HubIntroKey
  fallbackDescription: string
}): Promise<Metadata> {
  const {data: settings} = await sanityFetch({query: SITE_SETTINGS, stega: false})
  const introText = plainTextFromPortableText(settings?.[introKey])
  const description = normalizeDescription(introText) || fallbackDescription

  return buildPageMetadata({
    title,
    description,
    path,
    ogImage: ogImageFromSiteSettings((settings ?? null) as SiteSettingsOgImage),
  })
}
