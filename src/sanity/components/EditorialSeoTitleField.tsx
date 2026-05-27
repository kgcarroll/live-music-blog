'use client'

import {Stack} from '@sanity/ui'
import type {FieldProps} from 'sanity'
import {useGetFormValue} from 'sanity'

import {SeoGeneratorPanel} from '@/sanity/components/SeoGeneratorInput'

const EDITORIAL_SEO_TYPES = new Set(['interview', 'news', 'review'])

export function EditorialSeoTitleField(props: FieldProps) {
  const getFormValue = useGetFormValue()
  const documentType = getFormValue(['_type']) as string | undefined
  const showGenerator = EDITORIAL_SEO_TYPES.has(documentType ?? '')

  return (
    <Stack space={5}>
      {showGenerator ? <SeoGeneratorPanel /> : null}
      {props.renderDefault(props)}
    </Stack>
  )
}
