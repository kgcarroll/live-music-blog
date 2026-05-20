import {defineArrayMember, defineField, type ArrayOfType} from 'sanity'
import {imageTextRowBlock} from './portableTextBlocks'

export const bodyField = () =>
  defineField({
    name: 'body',
    title: 'Body',
    type: 'array',
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
          defineField({name: 'alt', type: 'string', title: 'Alt text', validation: (Rule) => Rule.required()}),
          defineField({name: 'caption', type: 'string', title: 'Caption'}),
        ],
      },
      imageTextRowBlock() as ArrayOfType<'object'>,
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
            title: 'Accessible title',
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
    ],
  })

export const coverField = () =>
  defineField({
    name: 'coverImage',
    title: 'Cover image',
    type: 'image',
    options: {hotspot: true},
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt text'})],
  })

/** Wide hero image for the homepage carousel; falls back to cover image when empty. */
export const featureImageField = () =>
  defineField({
    name: 'featureImage',
    title: 'Feature image',
    description:
      'Homepage carousel only. Use a 16:9 image and set the hotspot in Studio to frame the subject. Leave empty to use the cover image.',
    type: 'image',
    options: {hotspot: true},
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt text'})],
  })

export const tagsField = () =>
  defineField({
    name: 'tags',
    title: 'Tags',
    description: 'Connect this article to tag hub pages and related articles.',
    type: 'array',
    of: [defineArrayMember({type: 'reference', to: [{type: 'tag'}]})],
  })

export const seoFields = () => [
  defineField({name: 'seoTitle', type: 'string', title: 'SEO title'}),
  defineField({name: 'seoDescription', type: 'text', title: 'SEO description', rows: 3}),
]
