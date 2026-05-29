/** Fixed Sanity document id for the Site Settings singleton. */
export const SITE_SETTINGS_DOCUMENT_ID = 'siteSettings'

export const EDITORIAL_DOCUMENT_TYPES = ['interview', 'news', 'review'] as const

/** Initial value template for creating a tag with a prefilled title (see sanity.config.ts). */
export const TAG_FROM_TITLE_TEMPLATE_ID = 'tag-from-title'

/** Dispatched after a suggested tag is published; coordinator links + navigates back. */
export const TAG_POST_PUBLISH_EVENT = 'pml-tag-post-publish'

/** Dispatched after link + navigation so open article forms can refresh UI. */
export const TAG_LINKED_TO_ARTICLE_EVENT = 'pml-tag-linked'

export type TagLinkedToArticleDetail = {
  articleDocumentId: string
  articleType: string
  tagTitle: string
  tagId: string
}

/** Document pane path used to focus the tags field after tag-create flow. */
export const TAG_FOCUS_FIELD_PATH = 'tags'

/** Registered by sanity-plugin-media; managed inside the Media tool, not the desk. */
export const MEDIA_TAG_DOCUMENT_TYPE = 'media.tag'

/** Document types omitted from the custom structure sidebar list. */
export const STRUCTURE_HIDDEN_DOCUMENT_TYPES = [
  SITE_SETTINGS_DOCUMENT_ID,
  MEDIA_TAG_DOCUMENT_TYPE,
  'eventArchive',
  'spotifyArtistMatch',
  'eventSpotifyCuration',
] as const
