'use server'

import type {EditorialCardItem} from '@/components/EditorialCard'
import {SECTION_EDITORIAL_PAGE_SIZE, TAG_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {POSTS_BY_TAG_ID_PAGE, SECTION_EDITORIAL_PAGE} from '@/sanity/lib/queries'

export type EditorialListPageResult = {
  items: EditorialCardItem[]
  hasMore: boolean
}

async function fetchSectionPage(
  type: string,
  offset: number,
): Promise<EditorialListPageResult> {
  const start = offset
  const end = offset + SECTION_EDITORIAL_PAGE_SIZE + 1
  const {data} = await sanityFetch({
    query: SECTION_EDITORIAL_PAGE,
    params: {type, start, end},
  })
  const rows = (data ?? []) as EditorialCardItem[]
  return {
    items: rows.slice(0, SECTION_EDITORIAL_PAGE_SIZE),
    hasMore: rows.length > SECTION_EDITORIAL_PAGE_SIZE,
  }
}

export async function fetchSectionEditorialThroughPage(
  type: string,
  page: number,
): Promise<EditorialListPageResult> {
  const maxPage = Math.max(0, page)
  const limit = (maxPage + 1) * SECTION_EDITORIAL_PAGE_SIZE
  const end = limit + 1
  const {data} = await sanityFetch({
    query: SECTION_EDITORIAL_PAGE,
    params: {type, start: 0, end},
  })
  const rows = (data ?? []) as EditorialCardItem[]
  return {
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
  }
}

async function fetchTagPage(tagId: string, offset: number): Promise<EditorialListPageResult> {
  const start = offset
  const end = offset + TAG_EDITORIAL_PAGE_SIZE + 1
  const {data} = await sanityFetch({
    query: POSTS_BY_TAG_ID_PAGE,
    params: {tagId, start, end},
  })
  const rows = (data ?? []) as EditorialCardItem[]
  return {
    items: rows.slice(0, TAG_EDITORIAL_PAGE_SIZE),
    hasMore: rows.length > TAG_EDITORIAL_PAGE_SIZE,
  }
}

export async function fetchTagEditorialThroughPage(
  tagId: string,
  page: number,
): Promise<EditorialListPageResult> {
  const maxPage = Math.max(0, page)
  const limit = (maxPage + 1) * TAG_EDITORIAL_PAGE_SIZE
  const end = limit + 1
  const {data} = await sanityFetch({
    query: POSTS_BY_TAG_ID_PAGE,
    params: {tagId, start: 0, end},
  })
  const rows = (data ?? []) as EditorialCardItem[]
  return {
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
  }
}

export async function loadOlderSectionEditorial(
  type: string,
  offset: number,
): Promise<EditorialListPageResult> {
  if (offset < 0) return {items: [], hasMore: false}
  return fetchSectionPage(type, offset)
}

export async function loadOlderTagEditorial(
  tagId: string,
  offset: number,
): Promise<EditorialListPageResult> {
  if (offset < 0) return {items: [], hasMore: false}
  return fetchTagPage(tagId, offset)
}
