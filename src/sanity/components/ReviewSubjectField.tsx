'use client'

import {Stack, Text} from '@sanity/ui'
import type {FieldProps} from 'sanity'
import {useGetFormValue} from 'sanity'

import {isLiveConcertReviewSubject, resolveReviewSubject} from '@/lib/reviewSubject'
import {LiveConcertJsonLdSuggestPanel} from '@/sanity/components/LiveConcertJsonLdSuggestPanel'

export function ReviewSubjectField(props: FieldProps) {
  const getFormValue = useGetFormValue()
  const reviewSubject = getFormValue(['reviewSubject'])
  const showDate = getFormValue(['showDate']) as string | undefined
  const venueName = getFormValue(['venueName']) as string | undefined
  const subject = resolveReviewSubject(reviewSubject, showDate, venueName)
  const isLiveConcert = isLiveConcertReviewSubject(subject)

  return (
    <Stack space={5}>
      {props.renderDefault(props)}

      {isLiveConcert ? (
        <Stack space={4}>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Live concert (structured data)
            </Text>
            <Text size={1} muted>
              For Google review markup: when and where the performance happened. Not used for album
              or video reviews.
            </Text>
          </Stack>
          <LiveConcertJsonLdSuggestPanel />
        </Stack>
      ) : (
        <Text size={1} muted>
          Concert date and venue fields are hidden for this review type. Search title and
          description above still apply.
        </Text>
      )}
    </Stack>
  )
}
