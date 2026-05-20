'use client'

import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import type {HomeFeaturedHero} from '@/lib/homeFeatured'
import {HomeFeaturedHeroSlide} from '@/components/HomeFeaturedHeroSlide'

const AUTO_ADVANCE_MS = 7000
const SWIPE_THRESHOLD_PX = 48
const DRAG_INTENT_PX = 10
const WHEEL_THRESHOLD_PX = 40
const WHEEL_COOLDOWN_MS = 450

export function HomeFeaturedSlideshow({items}: {items: HomeFeaturedHero[]}) {
  const router = useRouter()
  const slides = items.filter((item) => item.slug)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const count = slides.length
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{x: number; y: number} | null>(null)
  const didSwipe = useRef(false)
  const wheelCooldown = useRef(false)

  const goTo = useCallback(
    (next: number) => {
      if (count < 2) return
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  const goNext = useCallback(() => goTo(index + 1), [goTo, index])
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])

  const navButtonClass =
    'pointer-events-auto text-3xl leading-none text-zinc-500 transition hover:text-amber-300 focus-visible:outline-none focus-visible:text-amber-300 sm:text-4xl'

  useEffect(() => {
    setIndex(0)
  }, [count])

  useEffect(() => {
    if (count < 2 || paused || isDragging) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const timer = window.setInterval(goNext, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [count, goNext, index, isDragging, paused])

  useEffect(() => {
    const node = viewportRef.current
    if (!node || count < 2) return

    const finishDrag = (clientX: number, clientY: number) => {
      const start = dragStart.current
      dragStart.current = null
      if (!start) return

      const deltaX = clientX - start.x
      const deltaY = clientY - start.y

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
        didSwipe.current = true
        setIndex((current) =>
          deltaX > 0 ? (current - 1 + count) % count : (current + 1) % count,
        )
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if ((event.target as HTMLElement).closest('button')) return

      dragStart.current = {x: event.clientX, y: event.clientY}
      didSwipe.current = false
      setIsDragging(true)
      node.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragStart.current) return
      const deltaX = event.clientX - dragStart.current.x
      const deltaY = event.clientY - dragStart.current.y
      if (Math.abs(deltaX) > DRAG_INTENT_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
        event.preventDefault()
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      finishDrag(event.clientX, event.clientY)
      setIsDragging(false)
      if (node.hasPointerCapture(event.pointerId)) {
        node.releasePointerCapture(event.pointerId)
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return
      if (Math.abs(event.deltaX) < WHEEL_THRESHOLD_PX) return
      if (wheelCooldown.current) return

      event.preventDefault()
      wheelCooldown.current = true
      window.setTimeout(() => {
        wheelCooldown.current = false
      }, WHEEL_COOLDOWN_MS)

      setIndex((current) =>
        event.deltaX < 0 ? (current + 1) % count : (current - 1 + count) % count,
      )
    }

    const onClick = (event: MouseEvent) => {
      if (didSwipe.current) {
        event.preventDefault()
        event.stopPropagation()
        didSwipe.current = false
        return
      }
      if ((event.target as HTMLElement).closest('button')) return

      const slide = (event.target as HTMLElement).closest('[data-hero-href]')
      const href = slide?.getAttribute('data-hero-href')
      if (href) router.push(href)
    }

    node.addEventListener('pointerdown', onPointerDown)
    node.addEventListener('pointermove', onPointerMove)
    node.addEventListener('pointerup', onPointerUp)
    node.addEventListener('pointercancel', onPointerUp)
    node.addEventListener('wheel', onWheel, {passive: false})
    node.addEventListener('click', onClick)

    return () => {
      node.removeEventListener('pointerdown', onPointerDown)
      node.removeEventListener('pointermove', onPointerMove)
      node.removeEventListener('pointerup', onPointerUp)
      node.removeEventListener('pointercancel', onPointerUp)
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('click', onClick)
    }
  }, [count, router])

  if (!count) return null

  return (
    <section
      className="relative mb-10"
      aria-roledescription="carousel"
      aria-label="Featured stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div
        ref={viewportRef}
        className="relative touch-pan-y select-none overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing"
      >
        {slides.map((item, slideIndex) => {
          const isActive = slideIndex === index
          return (
            <div
              key={item._id}
              className={`transition-opacity duration-500 ${
                isActive
                  ? 'relative z-10 opacity-100'
                  : 'pointer-events-none absolute inset-0 z-0 opacity-0'
              }`}
              aria-hidden={!isActive}
            >
              <HomeFeaturedHeroSlide item={item} priority={slideIndex === 0} />
            </div>
          )
        })}

        {count > 1 ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6">
            <button
              type="button"
              className={navButtonClass}
              aria-label="Previous featured story"
              onClick={goPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className={navButtonClass}
              aria-label="Next featured story"
              onClick={goNext}
            >
              ›
            </button>
          </div>
        ) : null}

        {count > 1 ? (
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((item, dotIndex) => (
              <button
                key={item._id}
                type="button"
                className={`pointer-events-auto h-2 w-2 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                  dotIndex === index ? 'bg-amber-300' : 'bg-zinc-500/80 hover:bg-zinc-300'
                }`}
                aria-label={`Go to featured story ${dotIndex + 1} of ${count}`}
                aria-current={dotIndex === index ? 'true' : undefined}
                onClick={() => goTo(dotIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
