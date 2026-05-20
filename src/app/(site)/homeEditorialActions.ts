'use server'

import type {EditorialCardItem} from '@/components/EditorialCard'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_EDITORIAL_PAGE} from '@/sanity/lib/queries'

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
