import {MicrophoneIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {
  editorialBodyField,
  coverField,
  editorialDocumentGroups,
  featuredField,
  featureImageField,
  seoFields,
  tagsField,
} from './blocks'

export const interview = defineType({
  name: 'interview',
  title: 'Interview',
  type: 'document',
  icon: MicrophoneIcon,
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
        'Short summary shown under the title on the interview page and in the homepage carousel when this interview is featured.',
    }),
    featuredField(),
    featureImageField(),
    coverField(),
    defineField({name: 'excerpt', type: 'text', title: 'Excerpt', group: 'content', rows: 3}),
    editorialBodyField(),
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
