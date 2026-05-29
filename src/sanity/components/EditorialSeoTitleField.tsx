'use client'

import {Stack} from '@sanity/ui'
import type {FieldProps} from 'sanity'
import {useGetFormValue} from 'sanity'

import {SeoGeneratorPanel} from '@/sanity/components/SeoGeneratorInput'

const SEO_GENERATOR_TYPES = new Set(['interview', 'news', 'review', 'newsletterIssue'])

export function EditorialSeoTitleField(props: FieldProps) {
  const getFormValue = useGetFormValue()
  const documentType = getFormValue(['_type']) as string | undefined
  const showGenerator = SEO_GENERATOR_TYPES.has(documentType ?? '')

  return (
    <Stack space={5}>
      {showGenerator ? <SeoGeneratorPanel /> : null}
      {props.renderDefault(props)}
    </Stack>
  )
}
