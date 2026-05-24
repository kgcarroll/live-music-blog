'use client'

import {CalendarIcon, DragHandleIcon, LaunchIcon, StarIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, useToast} from '@sanity/ui'
import {useCallback, useEffect, useState, type DragEvent} from 'react'
import {IntentLink} from 'sanity/router'
import {useClient} from 'sanity'

import {
  fetchStudioHomeCarouselFromApi,
  reorderStudioHomeCarouselSlides,
  studioApiOrigin,
  studioHomeCarouselOrderKeys,
  studioHomeCarouselSlideOrderKey,
  type StudioHomeCarouselResponse,
  type StudioHomeCarouselSlide,
} from '@/lib/studioHomeCarousel'
import {apiVersion} from '@/sanity/lib/client'
import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'

function SlideCard({
  slide,
  position,
  eventPinned,
  dragHandleProps,
  isDragging,
  isDropTarget,
}: {
  slide: StudioHomeCarouselSlide
  position: number
  eventPinned: boolean
  dragHandleProps: {
    draggable: boolean
    onDragStart: (event: DragEvent<HTMLButtonElement>) => void
    onDragEnd: () => void
  }
  isDragging: boolean
  isDropTarget: boolean
}) {
  const cardStyle = {
    opacity: isDragging ? 0.55 : 1,
    outline: isDropTarget ? '2px solid var(--card-focus-ring-color)' : undefined,
  }

  const dragControls = (
    <Button
      {...dragHandleProps}
      icon={DragHandleIcon}
      mode="bleed"
      tone="default"
      aria-label={`Drag slide ${position}`}
      style={{cursor: dragHandleProps.draggable ? 'grab' : 'default'}}
    />
  )

  if (slide.kind === 'editorial') {
    const title = slide.item.title?.trim() || 'Untitled'
    const type = slide.item._type ?? 'document'

    return (
      <Card padding={3} radius={2} border style={cardStyle}>
        <Flex gap={3} align="flex-start">
          {dragControls}
          <Text muted size={1} style={{minWidth: '1.5rem'}}>
            {position}.
          </Text>
          <Stack space={3} flex={1}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                {title}
              </Text>
              <Text size={0} muted>
                Editorial · {type}
              </Text>
            </Stack>
            <IntentLink intent="edit" params={{id: slide.item._id, type}}>
              <Button text="Open in editor" mode="ghost" fontSize={1} />
            </IntentLink>
          </Stack>
        </Flex>
      </Card>
    )
  }

  const role = eventPinned ? 'Pinned concert' : 'Random concert today'
  const place = slide.item.venueLabel
    ? `${slide.item.whenLabel} · ${slide.item.venueLabel}`
    : slide.item.whenLabel

  return (
    <Card padding={3} radius={2} border tone="positive" style={cardStyle}>
      <Flex gap={3} align="flex-start">
        {dragControls}
        <Text muted size={1} style={{minWidth: '1.5rem'}}>
          {position}.
        </Text>
        {slide.item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN thumbnail
          <img
            src={slide.item.imageUrl}
            alt=""
            width={72}
            height={72}
            className="size-[72px] shrink-0 rounded object-cover"
          />
        ) : (
          <Flex
            align="center"
            justify="center"
            className="size-[72px] shrink-0 rounded bg-zinc-100 dark:bg-zinc-800"
          >
            <CalendarIcon />
          </Flex>
        )}
        <Stack space={3} flex={1}>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              {slide.item.name}
            </Text>
            <Text size={0} muted>
              {role} · Ticketmaster
            </Text>
            <Text size={1} muted>
              {place}
            </Text>
            <Text size={0} muted>
              /events/{slide.item.slug}
            </Text>
          </Stack>
          <Flex gap={2} wrap="wrap">
            <Button
              as="a"
              href={`${studioApiOrigin()}/events/${slide.item.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              text="View on site"
              icon={LaunchIcon}
              mode="ghost"
              fontSize={1}
            />
            <IntentLink
              intent="edit"
              params={{id: SITE_SETTINGS_DOCUMENT_ID, type: 'siteSettings'}}
            >
              <Button text="Edit pin in Site Settings" mode="ghost" fontSize={1} />
            </IntentLink>
          </Flex>
        </Stack>
      </Flex>
    </Card>
  )
}

export function HomepageCarouselDesk() {
  const client = useClient({apiVersion})
  const toast = useToast()
  const [data, setData] = useState<StudioHomeCarouselResponse | null>(null)
  const [slides, setSlides] = useState<StudioHomeCarouselSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [hasCustomOrder, setHasCustomOrder] = useState(false)
  const [hasDraftSlideOrder, setHasDraftSlideOrder] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchStudioHomeCarouselFromApi(studioApiOrigin())
    if (!result) {
      setError('Could not load the live homepage carousel. Make sure the site dev server is running.')
      setData(null)
      setSlides([])
    } else {
      setData(result)
      setSlides(result.slides)
      setHasCustomOrder(result.slideOrder.length > 0)
      setHasDraftSlideOrder(result.hasDraftSlideOrder)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persistOrder = useCallback(
    async (nextSlides: StudioHomeCarouselSlide[]) => {
      const order = studioHomeCarouselOrderKeys(nextSlides)
      setSaving(true)
      try {
        await client
          .patch(SITE_SETTINGS_DOCUMENT_ID)
          .set({homepageCarouselSlideOrder: order})
          .commit()
        setHasCustomOrder(true)
        setHasDraftSlideOrder(true)
        toast.push({
          status: 'success',
          title: 'Carousel order saved',
          description: 'Publish Site Settings to apply on the live site.',
        })
      } catch {
        toast.push({
          status: 'error',
          title: 'Could not save carousel order',
        })
        void load()
      } finally {
        setSaving(false)
      }
    },
    [client, load, toast],
  )

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null)
        setDropIndex(null)
        return
      }

      const nextSlides = reorderStudioHomeCarouselSlides(slides, dragIndex, targetIndex)
      setSlides(nextSlides)
      setDragIndex(null)
      setDropIndex(null)
      void persistOrder(nextSlides)
    },
    [dragIndex, persistOrder, slides],
  )

  const resetOrder = useCallback(async () => {
    setSaving(true)
    try {
      await client.patch(SITE_SETTINGS_DOCUMENT_ID).unset(['homepageCarouselSlideOrder']).commit()
      toast.push({
        status: 'success',
        title: 'Carousel order reset',
        description: 'Publish Site Settings to restore the default order on the live site.',
      })
      await load()
    } catch {
      toast.push({
        status: 'error',
        title: 'Could not reset carousel order',
      })
    } finally {
      setSaving(false)
    }
  }, [client, load, toast])

  if (loading) {
    return (
      <Box padding={4}>
        <Flex align="center" gap={3}>
          <Spinner />
          <Text size={1} muted>
            Loading homepage carousel…
          </Text>
        </Flex>
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Box padding={4}>
        <Card padding={4} radius={2} tone="critical" border>
          <Stack space={3}>
            <Text size={1}>{error ?? 'Carousel unavailable.'}</Text>
            <Text size={1} muted>
              Editorial slides still appear below once Sanity loads. The concert slide needs the
              Next.js API route at /api/studio/homepage-carousel (same origin as Studio).
            </Text>
          </Stack>
        </Card>
      </Box>
    )
  }

  const eventSlide = slides.find((slide) => slide.kind === 'event')
  const eventName = eventSlide?.kind === 'event' ? eventSlide.item.name : null

  let summary = `${slides.length} slide${slides.length === 1 ? '' : 's'}`
  if (data.eventPinned && eventName) {
    summary += ` · pinned: ${eventName}`
  } else if (data.eventIncluded && !data.eventPinned) {
    summary += ' · random concert today'
  } else if (data.pinnedEventSlug && !data.eventIncluded) {
    summary += ' · pinned slug not in Ticketmaster feed (clear or update in Site Settings)'
  }

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Flex align="center" gap={2}>
            <Text muted>
              <StarIcon />
            </Text>
            <Stack space={2}>
              <Text size={2} weight="semibold">
                Homepage carousel
              </Text>
              <Text size={1} muted>
                {summary}
              </Text>
            </Stack>
          </Flex>
          {hasCustomOrder ? (
            <Button
              text="Reset to default order"
              mode="ghost"
              tone="critical"
              disabled={saving}
              onClick={() => void resetOrder()}
            />
          ) : null}
        </Flex>

        <Text size={1} muted>
          Drag slides to reorder. {saving ? 'Saving…' : 'Changes save automatically.'}{' '}
          {hasDraftSlideOrder
            ? 'Publish Site Settings to apply on the live site.'
            : 'Publish Site Settings after your first reorder to apply on the live site.'}
        </Text>

        <Stack space={3}>
          {slides.map((slide, index) => (
            <Box
              key={
                slide.kind === 'editorial'
                  ? slide.item._id
                  : `${studioHomeCarouselSlideOrderKey(slide)}-${slide.item.id}`
              }
              onDragOver={(event) => {
                event.preventDefault()
                setDropIndex(index)
              }}
              onDragLeave={() => {
                if (dropIndex === index) setDropIndex(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                handleDrop(index)
              }}
            >
              <SlideCard
                slide={slide}
                position={index + 1}
                eventPinned={data.eventPinned}
                isDragging={dragIndex === index}
                isDropTarget={dropIndex === index && dragIndex !== index}
                dragHandleProps={{
                  draggable: !saving,
                  onDragStart: (event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(index))
                    setDragIndex(index)
                  },
                  onDragEnd: () => {
                    setDragIndex(null)
                    setDropIndex(null)
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}
