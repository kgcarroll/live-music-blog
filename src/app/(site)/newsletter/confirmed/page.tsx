import Link from 'next/link'
import type {Metadata} from 'next'
import {Suspense} from 'react'

import {NewsletterConfirmHide} from '@/components/NewsletterConfirmHide'
import {newsletterIndexHref} from '@/lib/paths'

export const metadata: Metadata = {
  title: 'Newsletter subscription',
  robots: {index: false},
}

type Props = {searchParams: Promise<{status?: string}>}

export default async function NewsletterConfirmedPage({searchParams}: Props) {
  const {status} = await searchParams

  const copy =
    status === 'ok'
      ? {
          title: 'You are subscribed',
          body: 'Thanks for confirming. Look for Philadelphia Music Live in your inbox.',
        }
      : status === 'invalid'
        ? {
            title: 'Link expired or invalid',
            body: 'This confirmation link is no longer valid. You can subscribe again from the site footer.',
          }
        : {
            title: 'Something went wrong',
            body: 'We could not confirm your subscription. Please try again from the site footer.',
          }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center md:px-6">
      <Suspense fallback={null}>
        <NewsletterConfirmHide />
      </Suspense>
      <h1 className="text-2xl font-semibold text-zinc-50">{copy.title}</h1>
      <p className="mt-4 text-zinc-400">{copy.body}</p>
      <p className="mt-8">
        <Link href={newsletterIndexHref()} className="text-amber-300 underline-offset-2 hover:underline">
          Newsletter archive
        </Link>
        {' · '}
        <Link href="/" className="text-amber-300 underline-offset-2 hover:underline">
          Home
        </Link>
      </p>
    </div>
  )
}
