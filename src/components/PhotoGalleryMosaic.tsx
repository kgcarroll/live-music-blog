'use client'

import Image from 'next/image'
import {useCallback, useEffect, useRef, useState, type TransitionEvent} from 'react'
import {createPortal} from 'react-dom'
import {urlForImage} from '@/sanity/lib/image'

export type PhotoGalleryImage = {
  _key?: string
  alt?: string | null
  caption?: string | null
  asset?: {
    _id?: string
    metadata?: {
      lqip?: string | null
      dimensions?: {width?: number; height?: number}
    } | null
  } | null
}

function lightboxSrc(img: PhotoGalleryImage) {
  return urlForImage(img as never).width(1920).fit('max').url()
}

function thumbSrc(img: PhotoGalleryImage) {
  return urlForImage(img as never).width(900).fit('max').url()
}

/** Column mosaic thumbnails; click opens lightbox (80vh, centered) with caption + prev/next. */
export function PhotoGalleryMosaic({images}: {images: PhotoGalleryImage[]}) {
  const items = images.filter((img) => img.asset?._id)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [lightboxEntered, setLightboxEntered] = useState(false)
  const [imageEntered, setImageEntered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isClosingRef = useRef(false)
  const prevOpenRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const finishClose = useCallback(() => {
    isClosingRef.current = false
    setOpenIndex(null)
  }, [])

  const close = useCallback(() => {
    isClosingRef.current = true
    setLightboxEntered(false)
    setImageEntered(false)
  }, [])

  useEffect(() => {
    if (openIndex === null) {
      prevOpenRef.current = null
      setLightboxEntered(false)
      setImageEntered(false)
      return
    }
    setImageEntered(false)
    const imageId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setImageEntered(true))
    })
    if (prevOpenRef.current === null) {
      setLightboxEntered(false)
      const lightboxId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setLightboxEntered(true))
      })
      prevOpenRef.current = openIndex
      return () => {
        cancelAnimationFrame(imageId)
        cancelAnimationFrame(lightboxId)
      }
    }
    prevOpenRef.current = openIndex
    return () => cancelAnimationFrame(imageId)
  }, [openIndex])

  const handleBackdropTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.propertyName !== 'opacity') return
      if (!isClosingRef.current) return
      isClosingRef.current = false
      finishClose()
    },
    [finishClose],
  )

  const goPrev = useCallback(() => {
    setOpenIndex((i) => {
      if (i === null || items.length === 0) return null
      return (i - 1 + items.length) % items.length
    })
  }, [items.length])

  const goNext = useCallback(() => {
    setOpenIndex((i) => {
      if (i === null || items.length === 0) return null
      return (i + 1) % items.length
    })
  }, [items.length])

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, close, goPrev, goNext])

  useEffect(() => {
    if (openIndex === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [openIndex])

  if (!items.length) return null

  const lightbox =
    mounted && openIndex !== null ? (
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/92 p-4 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          lightboxEntered ? 'opacity-100' : 'opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery"
        onClick={close}
        onTransitionEnd={handleBackdropTransitionEnd}
      >
        <button
          type="button"
          className="fixed right-4 top-4 z-[210] rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Close gallery"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="relative flex w-full max-w-6xl flex-col items-center gap-3">
          <div className="relative flex w-full min-h-0 max-w-full flex-1 items-center justify-center">
            {items.length > 1 ? (
              <button
                type="button"
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-900/90 p-2.5 text-zinc-200 shadow-sm transition-colors hover:border-amber-500/50 hover:text-amber-200 sm:left-2"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M14 6L8 12L14 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}

            {(() => {
              const img = items[openIndex]!
              const dims = img.asset?.metadata?.dimensions
              const w = Math.min(dims?.width || 1920, 1920)
              const h = Math.min(dims?.height || 1280, 1280)
              const lqip = img.asset?.metadata?.lqip
              return (
                <div className="flex h-[80vh] w-full items-center justify-center px-10 sm:px-16">
                  <div
                    className={`inline-block max-h-[80vh] max-w-[min(95vw,calc(100vw-8rem))] transition duration-300 ease-out motion-reduce:transition-none ${
                      imageEntered ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      key={img._key ?? img.asset?._id ?? openIndex}
                      src={lightboxSrc(img)}
                      alt={img.alt || 'Gallery image'}
                      width={w}
                      height={h}
                      sizes="(max-width: 768px) calc(100vw - 5rem), min(95vw, 90rem)"
                      className="object-contain"
                      style={{
                        height: '80vh',
                        width: 'auto',
                        maxWidth: 'min(95vw, calc(100vw - 8rem))',
                      }}
                      priority
                      placeholder={lqip ? 'blur' : 'empty'}
                      blurDataURL={lqip || undefined}
                    />
                  </div>
                </div>
              )
            })()}

            {items.length > 1 ? (
              <button
                type="button"
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-md border border-zinc-700 bg-zinc-900/90 p-2.5 text-zinc-200 shadow-sm transition-colors hover:border-amber-500/50 hover:text-amber-200 sm:right-2"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10 6L16 12L10 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>

          <div className="flex max-w-2xl flex-col items-center gap-1 px-2 text-center">
            {items[openIndex]?.caption?.trim() ? (
              <p className="text-sm leading-relaxed text-zinc-300">{items[openIndex].caption!.trim()}</p>
            ) : null}
            {items.length > 1 ? (
              <p className="text-xs tabular-nums text-zinc-500">
                {openIndex + 1} / {items.length}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    ) : null

  return (
    <div className="mx-auto mt-10 max-w-5xl px-4">
      <div className="columns-2 gap-x-3 sm:gap-x-4 md:columns-3 md:gap-x-5">
        {items.map((img, i) => {
          const dims = img.asset?.metadata?.dimensions
          const w = Math.min(dims?.width || 1200, 1200)
          const h = Math.min(dims?.height || 900, 900)
          const lqip = img.asset?.metadata?.lqip
          const src = thumbSrc(img)
          return (
            <div key={img._key ?? `gallery-${i}`} className="mb-3 break-inside-avoid sm:mb-4">
              <button
                type="button"
                className="group block w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-left shadow-sm outline-none ring-amber-400/40 transition hover:border-amber-500/40 focus-visible:ring-2"
                aria-label={img.alt ? `Open image: ${img.alt}` : `Open image ${i + 1} of ${items.length}`}
                onClick={() => setOpenIndex(i)}
              >
                <Image
                  src={src}
                  alt=""
                  width={w}
                  height={h}
                  sizes="(max-width: 767px) 45vw, 30vw"
                  className="h-auto w-full transition duration-300 group-hover:scale-[1.02]"
                  placeholder={lqip ? 'blur' : 'empty'}
                  blurDataURL={lqip || undefined}
                />
              </button>
            </div>
          )
        })}
      </div>
      {lightbox ? createPortal(lightbox, document.body) : null}
    </div>
  )
}
