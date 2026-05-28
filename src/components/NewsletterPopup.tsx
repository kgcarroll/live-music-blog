'use client'

import {useCallback, useEffect, useId, useRef, useState} from 'react'
import {usePathname} from 'next/navigation'

import {NewsletterSignup} from '@/components/NewsletterSignup'
import {SanityImage, type BodyImageValue} from '@/components/SanityImage'
import {
  isNewsletterPopupBlocked,
  isNewsletterPopupDelayElapsed,
  isNewsletterPopupPathExcluded,
  markNewsletterPopupSessionShown,
  markNewsletterPopupSoftHide,
  NEWSLETTER_POPUP_DELAY_MS,
  NEWSLETTER_POPUP_SCROLL_THRESHOLD,
  ensureNewsletterPopupTimerStart,
} from '@/lib/newsletterPopupStorage'

export type NewsletterPopupConfig = {
  enabled: boolean
  headline: string | null
  image: BodyImageValue | null
  cta: string | null
}

function scrollDepth(): number {
  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop
  const height = doc.scrollHeight - window.innerHeight
  if (height <= 0) return 1
  return scrollTop / height
}

export function NewsletterPopup({config}: {config: NewsletterPopupConfig}) {
  const pathname = usePathname() ?? ''
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const triggeredRef = useRef(false)

  const excluded = isNewsletterPopupPathExcluded(pathname)
  const active = config.enabled && !excluded

  const openPopup = useCallback(() => {
    if (triggeredRef.current) return
    if (isNewsletterPopupBlocked()) return
    triggeredRef.current = true
    markNewsletterPopupSessionShown()
    setOpen(true)
  }, [])

  const closePopup = useCallback(() => {
    setOpen(false)
  }, [])

  const onSubscribeSuccess = useCallback(() => {
    markNewsletterPopupSoftHide()
    closePopup()
  }, [closePopup])

  // 5s per-session delay, then arm scroll / exit-intent listeners.
  useEffect(() => {
    if (!active || isNewsletterPopupBlocked()) return

    const startMs = ensureNewsletterPopupTimerStart()
    let delayTimer: ReturnType<typeof setTimeout> | undefined
    let scrollRaf = 0

    const armTriggers = () => {
      if (triggeredRef.current || isNewsletterPopupBlocked()) return
      setArmed(true)
    }

    const remaining = NEWSLETTER_POPUP_DELAY_MS - (Date.now() - startMs)
    if (isNewsletterPopupDelayElapsed(startMs, NEWSLETTER_POPUP_DELAY_MS)) {
      armTriggers()
    } else {
      delayTimer = setTimeout(armTriggers, Math.max(0, remaining))
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
    }
  }, [active])

  useEffect(() => {
    if (!armed || !active || open) return

    let scrollRaf = 0

    const onScroll = () => {
      if (triggeredRef.current) return
      if (scrollDepth() >= NEWSLETTER_POPUP_SCROLL_THRESHOLD) {
        openPopup()
      }
    }

    const onScrollThrottled = () => {
      cancelAnimationFrame(scrollRaf)
      scrollRaf = requestAnimationFrame(onScroll)
    }

    const onMouseLeave = (event: MouseEvent) => {
      if (triggeredRef.current) return
      if (event.clientY > 12) return
      if (!window.matchMedia('(pointer: fine)').matches) return
      openPopup()
    }

    window.addEventListener('scroll', onScrollThrottled, {passive: true})
    document.documentElement.addEventListener('mouseleave', onMouseLeave)

    return () => {
      window.removeEventListener('scroll', onScrollThrottled)
      document.documentElement.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(scrollRaf)
    }
  }, [armed, active, open, openPopup])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopup()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, closePopup])

  useEffect(() => {
    if (open) dialogRef.current?.focus()
  }, [open])

  if (!active || !open) return null

  const headline =
    config.headline?.trim() || 'Get Philadelphia live music in your inbox'
  const cta = config.cta?.trim() || 'Subscribe'
  const hasImage = Boolean(config.image?.asset?._id || config.image?.asset?.url)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        aria-label="Close newsletter signup"
        onClick={closePopup}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-[101] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={closePopup}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 p-1 text-amber-400 transition hover:text-amber-300"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {hasImage ? (
          <div className="relative aspect-[16/9] w-full border-b border-zinc-800 bg-zinc-950">
            <SanityImage
              value={config.image!}
              sizes="(max-width: 512px) 100vw, 512px"
              priority
              variant="cover"
            />
          </div>
        ) : null}

        <div className="p-6 pt-5">
          <h2 id={titleId} className="pr-16 text-xl font-semibold tracking-tight text-zinc-50">
            {headline}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Updates on shows, reviews, and news around Philadelphia.
          </p>
          <NewsletterSignup
            variant="popup"
            submitLabel={cta}
            onSuccess={onSubscribeSuccess}
          />
        </div>
      </div>
    </div>
  )
}
