import type {MetadataRoute} from 'next'

import {absoluteSiteUrl, siteOrigin} from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/studio', '/api/', '/search'],
    },
    sitemap: absoluteSiteUrl('/sitemap.xml'),
    host: siteOrigin(),
  }
}
