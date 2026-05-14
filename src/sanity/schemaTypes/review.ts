import {defineField, defineType} from 'sanity'
import {bodyField, coverField, seoFields} from './blocks'

export const review = defineType({
  name: 'review',
  title: 'Review',
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
    defineField({name: 'verdict', type: 'string', title: 'One-line verdict'}),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube URL',
      type: 'url',
      description: 'Optional. Paste a watch, embed, Shorts, or youtu.be link — the video appears above the article body.',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value == null || value === '') return true
          const s = String(value).trim()
          try {
            void new URL(s.startsWith('http') ? s : `https://${s}`)
          } catch {
            return 'Enter a valid URL'
          }
          if (!/(youtube\.com|youtu\.be)/i.test(s)) {
            return 'Use a youtube.com or youtu.be link'
          }
          return true
        }),
    }),
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
