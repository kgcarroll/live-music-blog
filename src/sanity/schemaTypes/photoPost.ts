import {defineField, defineType} from 'sanity'
import {bodyField, coverField, featureImageField, seoFields, tagsField} from './blocks'

export const photoPost = defineType({
  name: 'photoPost',
  title: 'Photos',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', title: 'Title', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'publishedAt', type: 'datetime', title: 'Published At', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'author'}],
    }),
    defineField({name: 'galleryNote', type: 'text', title: 'Gallery Note', rows: 2}),
    defineField({name: 'featured', type: 'boolean', title: 'Featured', initialValue: false}),
    featureImageField(),
    coverField(),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      description:
        'Mosaic below the cover. Alt Text is required for each image. Use Body for extra copy and inline images.',
      type: 'array',
      options: {layout: 'grid'},
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({name: 'alt', type: 'string', title: 'Alt Text', validation: (Rule) => Rule.required()}),
            defineField({name: 'caption', type: 'string', title: 'Caption'}),
          ],
        },
      ],
    }),
    defineField({name: 'excerpt', type: 'text', title: 'Excerpt', rows: 3}),
    bodyField(),
    tagsField(),
    ...seoFields(),
  ],
  preview: {
    select: {title: 'title', media: 'coverImage', subtitle: 'publishedAt'},
    prepare({title, media, subtitle}) {
      return {
        title,
        media,
        subtitle: subtitle ? new Date(subtitle).toLocaleDateString() : '',
      }
    },
  },
})
