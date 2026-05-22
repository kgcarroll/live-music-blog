import {defineArrayMember, defineField} from 'sanity'

import {getSpotifyEmbed, spotifyEmbedTypeLabel} from '@/lib/spotify'

/** Content + SEO tabs for interview, news, photoPost, and review documents. */
export const editorialDocumentGroups = [
  {name: 'content', title: 'Content', default: true},
  {name: 'seo', title: 'SEO'},
]

export const bodyField = (group = 'content') =>
  defineField({
    name: 'body',
    title: 'Body',
    type: 'array',
    group,
    of: [
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
          defineField({name: 'alt', type: 'string', title: 'Alt Text', validation: (Rule) => Rule.required()}),
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
          prepare({title, subtitle}) {
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
          prepare({title, url}) {
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
    ],
  })

export const coverField = (group = 'content') =>
  defineField({
    name: 'coverImage',
    title: 'Cover Image',
    type: 'image',
    group,
    options: {hotspot: true},
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt Text'})],
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
      'Include in the homepage carousel (see Homepage Carousel in the desk). Featured posts take precedence. With one or two featured, the carousel fills out to three slides with the newest posts. With three or more featured, every featured post appears (publish for it to show on the live site).',
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
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt Text'})],
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

export const seoFields = () => [
  defineField({
    name: 'seoTitle',
    type: 'string',
    title: 'SEO Title',
    group: 'seo',
    description: 'Optional. Overrides the page title in search results and social previews.',
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
