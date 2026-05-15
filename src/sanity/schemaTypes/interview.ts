import {defineField, defineType} from 'sanity'
import {bodyField, coverField, seoFields} from './blocks'

export const interview = defineType({
  name: 'interview',
  title: 'Interview',
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
    defineField({name: 'subhead', type: 'string', title: 'Deck / subhead'}),
    defineField({name: 'featured', type: 'boolean', initialValue: false}),
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
