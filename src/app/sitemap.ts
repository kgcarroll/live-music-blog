import type {MetadataRoute} from 'next'

import {authorHref, editorialHref, tagHref} from '@/lib/paths'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {sanityFetch} from '@/sanity/lib/live'
import {SITEMAP_ENTRIES} from '@/sanity/lib/queries'

const STATIC_PATHS = [
  '/',
  '/interviews',
  '/news',
  '/photos',
  '/reviews',
  '/events',
  '/venues',
  '/authors',
  '/tags',
  '/about',
  '/contact',
] as const

function toLastModified(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function sitemapEntry(
  path: string,
  options?: {lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number},
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteSiteUrl(path),
    ...(options?.lastModified ? {lastModified: options.lastModified} : {}),
    ...(options?.changeFrequency ? {changeFrequency: options.changeFrequency} : {}),
    ...(options?.priority != null ? {priority: options.priority} : {}),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const {data} = await sanityFetch({
    query: SITEMAP_ENTRIES,
    perspective: 'published',
    stega: false,
  })

  const staticEntries = STATIC_PATHS.map((path) =>
    sitemapEntry(path, {
      changeFrequency: path === '/' ? 'daily' : 'weekly',
      priority: path === '/' ? 1 : 0.8,
    }),
  )

  const editorialEntries = (data?.editorial ?? []).map(
    (row: {_type: string; slug: string; lastModified?: string | null}) =>
      sitemapEntry(editorialHref(row._type, row.slug), {
        lastModified: toLastModified(row.lastModified),
        changeFrequency: 'monthly',
        priority: 0.7,
      }),
  )

  const authorEntries = (data?.authors ?? []).map((row: {slug: string; lastModified?: string | null}) =>
    sitemapEntry(authorHref(row.slug), {
      lastModified: toLastModified(row.lastModified),
      changeFrequency: 'monthly',
      priority: 0.5,
    }),
  )

  const tagEntries = (data?.tags ?? []).map((row: {slug: string; lastModified?: string | null}) =>
    sitemapEntry(tagHref(row.slug), {
      lastModified: toLastModified(row.lastModified),
      changeFrequency: 'weekly',
      priority: 0.6,
    }),
  )

  return [...staticEntries, ...editorialEntries, ...authorEntries, ...tagEntries]
}
