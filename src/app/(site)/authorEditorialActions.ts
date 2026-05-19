'use server'

import type {EditorialCardItem} from '@/components/EditorialCard'
import {AUTHOR_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {POSTS_BY_AUTHOR_SLUG} from '@/sanity/lib/queries'

export type AuthorEditorialPage = {
  items: EditorialCardItem[]
  hasMore: boolean
}

export async function loadOlderAuthorEditorial(slug: string, offset: number): Promise<AuthorEditorialPage> {
  const trimmedSlug = slug.trim()
  if (!trimmedSlug || offset < 0) return {items: [], hasMore: false}

  const start = offset
  const end = offset + AUTHOR_EDITORIAL_PAGE_SIZE + 1
  const {data} = await sanityFetch({
    query: POSTS_BY_AUTHOR_SLUG,
    params: {slug: trimmedSlug, start, end},
  })
  const rows = (data ?? []) as EditorialCardItem[]

  return {
    items: rows.slice(0, AUTHOR_EDITORIAL_PAGE_SIZE),
    hasMore: rows.length > AUTHOR_EDITORIAL_PAGE_SIZE,
  }
}
