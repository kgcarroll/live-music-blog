import {defineArrayMember, defineField, defineType} from 'sanity'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      description:
        'Author bio shown in full on the author page and clamped to two lines below articles.',
      of: [defineArrayMember({type: 'block'})],
    }),
  ],
  preview: {
    select: {title: 'name', slug: 'slug.current'},
    prepare({title, slug}) {
      return {title: title || 'Author', subtitle: slug ? `/${slug}` : ''}
    },
  },
})
