import {defineField, defineType} from 'sanity'
import {bodyField, coverField, seoFields} from './blocks'

export const photoPost = defineType({
  name: 'photoPost',
  title: 'Photos',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'publishedAt', type: 'datetime', validation: (Rule) => Rule.required()}),
    defineField({name: 'excerpt', type: 'text', rows: 3}),
    coverField(),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'author'}],
    }),
    defineField({name: 'galleryNote', type: 'text', title: 'Gallery note', rows: 2}),
    defineField({name: 'featured', type: 'boolean', initialValue: false}),
    defineField({name: 'venue', type: 'reference', to: [{type: 'venue'}]}),
    defineField({
      name: 'artists',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'artist'}]}],
    }),
    bodyField(),
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
