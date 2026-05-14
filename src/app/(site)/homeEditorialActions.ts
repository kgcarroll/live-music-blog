'use server'

import type {EditorialCardItem} from '@/components/EditorialCard'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_EDITORIAL_PAGE} from '@/sanity/lib/queries'

export async function loadOlderHomeEditorial(offset: number): Promise<EditorialCardItem[]> {
  if (offset < 0) return []
  const start = offset
  const end = offset + HOME_EDITORIAL_PAGE_SIZE
  const {data} = await sanityFetch({
    query: HOME_EDITORIAL_PAGE,
    params: {start, end},
  })
  return (data ?? []) as EditorialCardItem[]
}
