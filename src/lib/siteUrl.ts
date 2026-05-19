function normalizeOrigin(value: string | undefined) {
  const raw = value?.trim()
  if (!raw) return null
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/$/, '')
}

export function siteOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeOrigin(process.env.VERCEL_URL) ||
    'http://localhost:3000'
  )
}

export function absoluteSiteUrl(path: string) {
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}
