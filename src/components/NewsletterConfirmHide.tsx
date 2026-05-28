'use client'

import {useEffect} from 'react'
import {useSearchParams} from 'next/navigation'

import {markNewsletterPopupHardHide} from '@/lib/newsletterPopupStorage'

/** Sets long-lived hide flag after successful double opt-in. */
export function NewsletterConfirmHide() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('status') === 'ok') {
      markNewsletterPopupHardHide()
    }
  }, [searchParams])

  return null
}
