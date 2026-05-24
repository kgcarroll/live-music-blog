'use client'

import {useState} from 'react'

const CONSENT =
  'Weekly Philadelphia live-music updates from Philadelphia Music Live. Unsubscribe anytime from any email we send.'

export function NewsletterSignup({variant = 'default'}: {variant?: 'default' | 'footer'}) {
  const isFooter = variant === 'footer'
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const website = String(fd.get('website') || '')
    if (website) {
      setStatus('ok')
      setMessage('Check your inbox to confirm your subscription.')
      return
    }

    setStatus('loading')
    setMessage('')

    const email = String(fd.get('email') || '').trim()
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })
      const data = (await res.json().catch(() => ({}))) as {error?: string}
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again later.')
        return
      }
      setStatus('ok')
      setMessage('Check your inbox to confirm your subscription.')
      form.reset()
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again later.')
    }
  }

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className={
        isFooter
          ? 'w-full max-w-md md:ml-auto'
          : 'mt-10 border-t border-zinc-800 pt-8'
      }
    >
      <h2
        id="newsletter-heading"
        className={
          isFooter
            ? 'text-sm font-semibold uppercase tracking-wide text-zinc-200'
            : 'text-center text-sm font-semibold uppercase tracking-wide text-zinc-200'
        }
      >
        Newsletter
      </h2>
      <p
        className={
          isFooter
            ? 'mt-2 text-sm text-zinc-400'
            : 'mx-auto mt-2 max-w-md text-center text-sm text-zinc-400'
        }
      >
        Get weekly updates on shows, reviews, and news around Philadelphia.
      </p>
      <form onSubmit={onSubmit} className={isFooter ? 'mt-4' : 'mx-auto mt-4 max-w-md'}>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="newsletter-email">
            Email
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {status === 'loading' ? 'Sending…' : 'Subscribe'}
          </button>
        </div>
        <p className={`mt-2 text-xs text-zinc-500 ${isFooter ? '' : 'text-center'}`}>{CONSENT}</p>
        {message ? (
          <p
            role={status === 'error' ? 'alert' : 'status'}
            className={`mt-3 text-sm ${isFooter ? '' : 'text-center'} ${status === 'error' ? 'text-red-400' : 'text-amber-200'}`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  )
}
