import {defineField, defineType} from 'sanity'

export const venue = defineType({
  name: 'venue',
  title: 'Venue',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'city', type: 'string'}),
    defineField({name: 'address', type: 'text', rows: 2}),
    defineField({name: 'mapUrl', type: 'url', title: 'Map link'}),
    defineField({name: 'logo', type: 'image', options: {hotspot: true}}),
  ],
  preview: {
    select: {title: 'name', subtitle: 'city'},
    prepare({title, subtitle}) {
      return {title, subtitle}
    },
  },
})
