import {defineField, defineType} from 'sanity'
import {bodyField, coverField, editorialDocumentGroups, featureImageField, seoFields, tagsField} from './blocks'

export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  groups: editorialDocumentGroups,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      title: 'Published At',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'content',
      to: [{type: 'author'}],
    }),
    defineField({
      name: 'verdict',
      type: 'string',
      title: 'One-Line Verdict',
      group: 'content',
      description:
        'Short summary shown under the title on the review page and in the homepage carousel when this review is featured.',
    }),
    defineField({name: 'featured', type: 'boolean', title: 'Featured', group: 'content', initialValue: false}),
    featureImageField(),
    coverField(),
    defineField({name: 'excerpt', type: 'text', title: 'Excerpt', group: 'content', rows: 3}),
    bodyField(),
    tagsField(),
    ...seoFields(),
    defineField({
      name: 'showDate',
      type: 'datetime',
      title: 'Show Date',
      group: 'seo',
      description:
        'Optional. When the concert happened. With Venue, enables MusicEvent in review JSON-LD; otherwise the article title is used.',
    }),
    defineField({
      name: 'venueName',
      type: 'string',
      title: 'Venue',
      group: 'seo',
      description:
        'Optional. Venue or city, e.g. "Capital One Arena". With Show Date, enables MusicEvent JSON-LD; leave empty to fall back to the review title only.',
    }),
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
