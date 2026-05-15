'use client'

import {useState} from 'react'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const website = String(fd.get('website') || '')
    if (website) {
      setStatus('ok')
      setMessage('Thanks — we will be in touch.')
      return
    }
    setStatus('loading')
    setMessage('')
    const payload = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      subject: String(fd.get('subject') || ''),
      message: String(fd.get('message') || ''),
    }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as {error?: string}
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again later.')
        return
      }
      setStatus('ok')
      setMessage('Thanks — your message was sent.')
      form.reset()
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again later.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-amber-500/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-amber-500/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium text-zinc-300">
          Subject (optional)
        </label>
        <input
          id="subject"
          name="subject"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-amber-500/40 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-zinc-300">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-amber-500/40 focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending...' : 'Send message'}
      </button>
      {message ? (
        <p
          className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
