/** Fixed Sanity document id for the Site Settings singleton. */
export const SITE_SETTINGS_DOCUMENT_ID = 'siteSettings'

export const EDITORIAL_DOCUMENT_TYPES = ['interview', 'news', 'review'] as const

/** Registered by sanity-plugin-media; managed inside the Media tool, not the desk. */
export const MEDIA_TAG_DOCUMENT_TYPE = 'media.tag'

/** Document types omitted from the custom structure sidebar list. */
export const STRUCTURE_HIDDEN_DOCUMENT_TYPES = [
  SITE_SETTINGS_DOCUMENT_ID,
  MEDIA_TAG_DOCUMENT_TYPE,
] as const
