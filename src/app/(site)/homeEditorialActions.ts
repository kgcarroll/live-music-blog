'use server'

import type {EditorialCardItem} from '@/components/EditorialCard'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_EDITORIAL_PAGE} from '@/sanity/lib/queries'

export type HomeEditorialPageResult = {
  items: EditorialCardItem[]
  hasMore: boolean
}

export async function loadOlderHomeEditorial(
  offset: number,
  excludeCarouselIds: string[],
): Promise<EditorialCardItem[]> {
  if (offset < 0) return []
  const start = offset
  const end = offset + HOME_EDITORIAL_PAGE_SIZE
  const {data} = await sanityFetch({
    query: HOME_EDITORIAL_PAGE,
    params: {start, end, excludeIds: excludeCarouselIds},
  })
  return (data ?? []) as EditorialCardItem[]
}

export async function fetchHomeEditorialThroughPage(
  page: number,
  excludeCarouselIds: string[],
): Promise<HomeEditorialPageResult> {
  const maxPage = Math.max(0, page)
  const limit = (maxPage + 1) * HOME_EDITORIAL_PAGE_SIZE
  const end = limit + 1
  const {data} = await sanityFetch({
    query: HOME_EDITORIAL_PAGE,
    params: {start: 0, end, excludeIds: excludeCarouselIds},
  })
  const excludeSet = new Set(excludeCarouselIds)
  const rows = ((data ?? []) as EditorialCardItem[]).filter((item) => !excludeSet.has(item._id))
  return {
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
  }
}
