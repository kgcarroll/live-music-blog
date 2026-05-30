'use client'

import {Stack, Text} from '@sanity/ui'
import type {FieldProps} from 'sanity'
import {useGetFormValue} from 'sanity'

import {SeoGeneratorPanel} from '@/sanity/components/SeoGeneratorInput'

const SEO_GENERATOR_TYPES = new Set(['interview', 'news', 'review', 'newsletterIssue'])

export function EditorialSeoTitleField(props: FieldProps) {
  const getFormValue = useGetFormValue()
  const documentType = getFormValue(['_type']) as string | undefined
  const showGenerator = SEO_GENERATOR_TYPES.has(documentType ?? '')
  const isReview = documentType === 'review'

  return (
    <Stack space={5}>
      {showGenerator ? (
        <Stack space={4}>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Search &amp; social
            </Text>
            {isReview ? (
              <Text size={1} muted>
                Title and description for Google, social previews, and the site. Separate from
                concert structured data below.
              </Text>
            ) : null}
          </Stack>
          <SeoGeneratorPanel />
        </Stack>
      ) : null}
      {props.renderDefault(props)}
    </Stack>
  )
}
