import {DocumentsIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {
  bodyField,
  coverField,
  editorialDocumentGroups,
  featuredField,
  featureImageField,
  seoFields,
  tagsField,
} from './blocks'

export const news = defineType({
  name: 'news',
  title: 'News',
  type: 'document',
  icon: DocumentsIcon,
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
    defineField({name: 'subhead', type: 'string', title: 'Deck / Subhead', group: 'content'}),
    featuredField(),
    featureImageField(),
    coverField(),
    defineField({name: 'excerpt', type: 'text', title: 'Excerpt', group: 'content', rows: 3}),
    bodyField(),
    tagsField(),
    ...seoFields(),
  ],
  preview: {
    select: {title: 'title', media: 'coverImage', subtitle: 'publishedAt', featured: 'featured'},
    prepare({title, media, subtitle, featured}) {
      const date = subtitle ? new Date(subtitle).toLocaleDateString() : ''
      return {
        title,
        media,
        subtitle: [featured ? 'Featured' : null, date].filter(Boolean).join(' · '),
      }
    },
  },
})
