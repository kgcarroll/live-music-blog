import {defineField, defineType} from 'sanity'
import {bodyField, coverField, featureImageField, seoFields, tagsField} from './blocks'

export const review = defineType({
  name: 'review',
  title: 'Review',
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
    defineField({
      name: 'verdict',
      type: 'string',
      title: 'One-Line Verdict',
      description: 'Short summary shown under the title on the review page and in the homepage carousel when this review is featured.',
    }),
    defineField({name: 'featured', type: 'boolean', title: 'Featured', initialValue: false}),
    featureImageField(),
    coverField(),
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
