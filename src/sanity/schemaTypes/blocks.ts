import {defineArrayMember, defineField} from 'sanity'

import {EditorialSeoTitleField} from '@/sanity/components/EditorialSeoTitleField'
import {AiAltTextInput} from '@/sanity/components/AiAltTextInput'
import {getSpotifyEmbed, spotifyEmbedTypeLabel} from '@/lib/spotify'

/** Content + SEO tabs for interview, news, and review documents. */
export const editorialDocumentGroups = [
  {name: 'content', title: 'Content', default: true},
  {name: 'seo', title: 'SEO'},
]

const bodyEmbedTypeNames = ['youtubeEmbed', 'spotifyEmbed', 'instagramEmbed'] as const

const galleryImageMember = {
  type: 'image',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      type: 'string',
      title: 'Alt Text',
      validation: (Rule) => Rule.required(),
      components: {input: AiAltTextInput},
    }),
    defineField({name: 'caption', type: 'string', title: 'Caption'}),
  ],
}

const photoGalleryBlock = defineArrayMember({
  name: 'photoGallery',
  title: 'Photo Gallery',
  type: 'object',
  fields: [
    defineField({
      name: 'layout',
      type: 'string',
      title: 'Layout',
      initialValue: 'mosaic',
      options: {
        layout: 'radio',
        list: [
          {title: 'Mosaic grid', value: 'mosaic'},
          {title: 'Carousel', value: 'carousel'},
        ],
      },
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      options: {layout: 'grid'},
      of: [galleryImageMember],
    }),
  ],
  preview: {
    select: {layout: 'layout', images: 'images'},
    prepare({layout, images}: {layout?: string; images?: unknown}) {
      const count = Array.isArray(images) ? images.length : 0
      const layoutLabel = layout === 'carousel' ? 'carousel' : 'mosaic'
      return {
        title: 'Photo gallery',
        subtitle: count ? `${count} image${count === 1 ? '' : 's'} · ${layoutLabel}` : 'Add images',
      }
    },
  },
})

const bodyPortableTextOf = (includePhotoGallery: boolean) =>
  [
      {
        type: 'block',
        styles: [
          {title: 'Normal', value: 'normal'},
          {title: 'H2', value: 'h2'},
          {title: 'H3', value: 'h3'},
          {title: 'Quote', value: 'blockquote'},
        ],
        lists: [
          {title: 'Bullet', value: 'bullet'},
          {title: 'Number', value: 'number'},
        ],
        marks: {
          decorators: [
            {title: 'Strong', value: 'strong'},
            {title: 'Emphasis', value: 'em'},
          ],
          annotations: [{name: 'link', type: 'object', title: 'Link', fields: [{name: 'href', type: 'url', title: 'URL'}]}],
        },
      },
      {
        type: 'image',
        options: {hotspot: true},
        fields: [
          defineField({
            name: 'alt',
            type: 'string',
            title: 'Alt Text',
            validation: (Rule) => Rule.required(),
            components: {input: AiAltTextInput},
          }),
          defineField({name: 'caption', type: 'string', title: 'Caption'}),
          defineField({
            name: 'layout',
            type: 'string',
            title: 'Layout',
            initialValue: 'full',
            options: {
              layout: 'radio',
              list: [
                {title: 'Full width', value: 'full'},
                {title: 'Float left (50%, text wraps)', value: 'floatLeft'},
                {title: 'Float right (50%, text wraps)', value: 'floatRight'},
              ],
            },
          }),
        ],
      },
      {
        name: 'youtubeEmbed',
        title: 'YouTube Video',
        type: 'object',
        fields: [
          defineField({
            name: 'url',
            title: 'YouTube URL',
            type: 'url',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'title',
            title: 'Accessible Title',
            type: 'string',
            initialValue: 'YouTube Video',
          }),
        ],
        preview: {
          select: {
            title: 'title',
            subtitle: 'url',
          },
          prepare({title, subtitle}: {title?: string; subtitle?: string}) {
            return {
              title: title || 'YouTube Video',
              subtitle,
            }
          },
        },
      },
      {
        name: 'spotifyEmbed',
        title: 'Spotify',
        type: 'object',
        fields: [
          defineField({
            name: 'url',
            title: 'Spotify URL',
            type: 'url',
            description: 'Paste an open.spotify.com link to a track, album, playlist, episode, or show.',
            validation: (Rule) =>
              Rule.required().custom((url) => {
                if (!url || typeof url !== 'string') return true
                return getSpotifyEmbed(url) ? true : 'Use a valid Spotify share or embed URL'
              }),
          }),
          defineField({
            name: 'title',
            title: 'Accessible Title',
            type: 'string',
            initialValue: 'Spotify player',
          }),
        ],
        preview: {
          select: {title: 'title', url: 'url'},
          prepare({title, url}: {title?: string; url?: string}) {
            const embed = getSpotifyEmbed(typeof url === 'string' ? url : undefined)
            return {
              title: title || 'Spotify',
              subtitle: embed
                ? `${spotifyEmbedTypeLabel(embed.type)} · ${typeof url === 'string' ? url : ''}`
                : typeof url === 'string'
                  ? url
                  : 'Add a Spotify URL',
            }
          },
        },
      },
      defineArrayMember({type: 'instagramEmbed'}),
    ...(includePhotoGallery ? [photoGalleryBlock] : []),
  ] as const

/** Newsletter and other non-editorial portable text (no inline galleries). */
export const bodyField = (group = 'content') =>
  defineField({
    name: 'body',
    title: 'Body',
    type: 'array',
    group,
    options: {
      insertMenu: {
        groups: [
          {name: 'text', title: 'Text', of: ['block']},
          {name: 'media', title: 'Media', of: ['image']},
          {name: 'embeds', title: 'Embeds', of: [...bodyEmbedTypeNames]},
        ],
      },
    },
    of: [...bodyPortableTextOf(false)],
  })

/** Editorial article body with inline photo galleries (reviews, news, interviews). */
export const editorialBodyField = (group = 'content') =>
  defineField({
    name: 'body',
    title: 'Body',
    type: 'array',
    group,
    options: {
      insertMenu: {
        groups: [
          {name: 'text', title: 'Text', of: ['block']},
          {name: 'media', title: 'Media', of: ['image', 'photoGallery']},
          {name: 'embeds', title: 'Embeds', of: [...bodyEmbedTypeNames]},
        ],
      },
    },
    of: [...bodyPortableTextOf(true)],
  })

export const coverField = (group = 'content') =>
  defineField({
    name: 'coverImage',
    title: 'Cover Image',
    type: 'image',
    group,
    options: {hotspot: true},
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt Text', components: {input: AiAltTextInput}})],
  })

/** Wide hero image for the homepage carousel; falls back to cover image when empty. */
export const featuredField = (group = 'content') =>
  defineField({
    name: 'featured',
    type: 'boolean',
    title: 'Featured',
    group,
    initialValue: false,
    description:
      'Include in the homepage carousel (see Homepage Carousel in the desk). Featured posts take precedence. With one or two featured, the carousel fills out to three editorial slides with the newest posts; a fourth slide is a daily Ticketmaster concert pick (when configured). With three or more featured, every featured post appears, plus the concert slide (publish for posts to show on the live site).',
  })

export const featureImageField = (group = 'content') =>
  defineField({
    name: 'featureImage',
    title: 'Feature Image',
    group,
    description:
      'Homepage Carousel only. Use a 16:9 image and set the hotspot in Studio to frame the subject. Leave empty to use the Cover Image.',
    type: 'image',
    options: {hotspot: true},
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt Text', components: {input: AiAltTextInput}})],
  })

/** Simple rich text for static pages and section hub intros (Site Settings). */
export const pageIntroField = (
  name: string,
  title: string,
  description?: string,
  options?: {group?: string},
) =>
  defineField({
    name,
    title,
    type: 'array',
    description,
    of: [{type: 'block'}],
    ...(options?.group ? {group: options.group} : {}),
  })

export const tagsField = (group = 'content') =>
  defineField({
    name: 'tags',
    title: 'Tags',
    description: 'Connect this article to tag hub pages and related articles.',
    type: 'array',
    group,
    of: [defineArrayMember({type: 'reference', to: [{type: 'tag'}]})],
  })

/** Stored by the Facebook Caption document action (hidden in the editor; not a second input). */
export const facebookCaptionField = () =>
  defineField({
    name: 'facebookCaption',
    title: 'Facebook Caption',
    type: 'text',
    hidden: true,
  })

export const seoFields = () => [
  defineField({
    name: 'seoTitle',
    type: 'string',
    title: 'SEO Title',
    group: 'seo',
    description: 'Optional. Overrides the page title in search results and social previews.',
    components: {
      field: EditorialSeoTitleField,
    },
  }),
  defineField({
    name: 'seoDescription',
    type: 'text',
    title: 'SEO Description',
    group: 'seo',
    rows: 3,
    description: 'Optional meta description (about 160 characters). Falls back to excerpt or body when empty.',
  }),
]
