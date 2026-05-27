/**
 * `top` for `position: sticky` below the fixed site header.
 * `--site-sticky-top` is set on `<html>` by SiteHeader (header height + 12px buffer).
 */
export const SITE_STICKY_TOP_CLASS = 'top-[var(--site-sticky-top,6.5rem)]' as const
