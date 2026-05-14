import {defineField, defineType} from 'sanity'

export const artist = defineType({
  name: 'artist',
  title: 'Artist',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'photo', type: 'image', options: {hotspot: true}}),
    defineField({name: 'website', type: 'url'}),
    defineField({name: 'instagram', type: 'url'}),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'photo',
    },
    prepare({title, media}) {
      return {
        title: title || 'Artist',
        media,
      }
    },
  },
})
