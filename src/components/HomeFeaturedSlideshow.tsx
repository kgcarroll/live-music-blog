'use client'

import {useCallback, useEffect, useState} from 'react'
import type {HomeFeaturedHero} from '@/lib/homeFeatured'
import {HomeFeaturedHeroSlide} from '@/components/HomeFeaturedHeroSlide'

const AUTO_ADVANCE_MS = 7000

export function HomeFeaturedSlideshow({items}: {items: HomeFeaturedHero[]}) {
  const slides = items.filter((item) => item.slug)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = slides.length

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
    if (count < 2 || paused) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const timer = window.setInterval(goNext, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [count, goNext, index, paused])

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
      <div className="relative overflow-hidden rounded-2xl">
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
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((item, dotIndex) => (
              <button
                key={item._id}
                type="button"
                className={`h-2 w-2 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
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
