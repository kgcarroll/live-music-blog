/** Query param for "load more" page index (0 = first page only). */
export const LIST_PAGE_PARAM = 'page'

export function parseListPageParam(value: string | null | undefined): number {
  if (!value) return 0
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

export function parseListPageFromSearchParams(searchParams: URLSearchParams): number {
  return parseListPageParam(searchParams.get(LIST_PAGE_PARAM))
}

/** Update page in URL; omits param when page is 0. */
export function listPageHref(pathname: string, page: number, searchParams?: URLSearchParams): string {
  const params = new URLSearchParams(searchParams?.toString() ?? '')
  if (page <= 0) {
    params.delete(LIST_PAGE_PARAM)
  } else {
    params.set(LIST_PAGE_PARAM, String(page))
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
