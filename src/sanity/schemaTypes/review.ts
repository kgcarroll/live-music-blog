import {ThumbsUpIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {
  editorialBodyField,
  coverField,
  editorialDocumentGroups,
  facebookCaptionField,
  tagSuggestionsField,
  featuredField,
  featureImageField,
  seoFields,
  tagsField,
} from './blocks'
import {ReviewSubjectField} from '@/sanity/components/ReviewSubjectField'
import {REVIEW_SUBJECT_OPTIONS} from '@/lib/reviewSubject'

function isLiveConcertDocument(document: unknown): boolean {
  const subject = (document as {reviewSubject?: string} | undefined)?.reviewSubject
  return subject === 'liveConcert'
}

export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  icon: ThumbsUpIcon,
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
    featuredField(),
    featureImageField(),
    coverField(),
    defineField({name: 'excerpt', type: 'text', title: 'Excerpt', group: 'content', rows: 3}),
    editorialBodyField(),
    tagsField(),
    facebookCaptionField(),
    tagSuggestionsField(),
    ...seoFields(),
    defineField({
      name: 'reviewSubject',
      type: 'string',
      title: 'What is this review about?',
      group: 'seo',
      description:
        'Controls optional concert fields and how Google structured data describes the thing being reviewed.',
      options: {
        list: [...REVIEW_SUBJECT_OPTIONS],
        layout: 'radio',
      },
      initialValue: 'other',
      validation: (Rule) => Rule.required(),
      components: {
        field: ReviewSubjectField,
      },
    }),
    defineField({
      name: 'showDate',
      type: 'datetime',
      title: 'Concert date',
      group: 'seo',
      description:
        'When the live performance happened. Used in JSON-LD for concert reviews. If empty, Published At is used as a fallback.',
      hidden: ({document}) => !isLiveConcertDocument(document),
    }),
    defineField({
      name: 'venueName',
      type: 'string',
      title: 'Venue',
      group: 'seo',
      description:
        'Where the concert took place, e.g. "Union Transfer". If empty, the review title is used in structured data.',
      hidden: ({document}) => !isLiveConcertDocument(document),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'coverImage',
      subtitle: 'publishedAt',
      featured: 'featured',
      reviewSubject: 'reviewSubject',
    },
    prepare({title, media, subtitle, featured, reviewSubject}) {
      const date = subtitle ? new Date(subtitle).toLocaleDateString() : ''
      const subjectLabel =
        REVIEW_SUBJECT_OPTIONS.find((option) => option.value === reviewSubject)?.title ?? null
      return {
        title,
        media,
        subtitle: [featured ? 'Featured' : null, subjectLabel, date].filter(Boolean).join(' · '),
      }
    },
  },
})
