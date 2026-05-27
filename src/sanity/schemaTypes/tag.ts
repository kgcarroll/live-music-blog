import {TagIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      description: 'Intro content shown at the top of this tag hub page.',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({
      name: 'linkToArticleId',
      title: 'Link to article (id)',
      type: 'string',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'linkToArticleType',
      title: 'Link to article (type)',
      type: 'string',
      hidden: true,
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
    prepare({title, subtitle}) {
      return {
        title,
        subtitle: subtitle ? `/tags/${subtitle}` : '',
      }
    },
  },
})
