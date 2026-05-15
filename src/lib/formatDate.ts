const EDITORIAL_DATE: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

/** Stable en-US formatting so server and client markup match when dates are SSR'd. */
export function formatEditorialDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', EDITORIAL_DATE)
}
