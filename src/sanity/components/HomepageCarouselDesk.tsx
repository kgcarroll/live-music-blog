'use client'

import {CalendarIcon, LaunchIcon, StarIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useEffect, useState} from 'react'
import {IntentLink} from 'sanity/router'

import {
  fetchStudioHomeCarouselFromApi,
  studioApiOrigin,
  type StudioHomeCarouselResponse,
  type StudioHomeCarouselSlide,
} from '@/lib/studioHomeCarousel'
import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'

function SlideCard({
  slide,
  position,
  eventPinned,
}: {
  slide: StudioHomeCarouselSlide
  position: number
  eventPinned: boolean
}) {
  if (slide.kind === 'editorial') {
    const title = slide.item.title?.trim() || 'Untitled'
    const type = slide.item._type ?? 'document'

    return (
      <Card padding={3} radius={2} border>
        <Flex gap={3} align="flex-start">
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
            <IntentLink
              intent="edit"
              params={{id: slide.item._id, type}}
            >
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
    <Card padding={3} radius={2} border tone="positive">
      <Flex gap={3} align="flex-start">
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
  const [data, setData] = useState<StudioHomeCarouselResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const result = await fetchStudioHomeCarouselFromApi(studioApiOrigin())
      if (cancelled) return
      if (!result) {
        setError('Could not load the live homepage carousel. Make sure the site dev server is running.')
        setData(null)
      } else {
        setData(result)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

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

  const eventSlide = data.slides.find((slide) => slide.kind === 'event')
  const eventName = eventSlide?.kind === 'event' ? eventSlide.item.name : null

  let summary = `${data.slides.length} slide${data.slides.length === 1 ? '' : 's'} on the live homepage`
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
        <Flex align="center" gap={2}>
          <Text muted>
            <StarIcon />
          </Text>
          <Stack space={2}>
            <Text size={2} weight="semibold">
              Homepage carousel on site
            </Text>
            <Text size={1} muted>
              {summary}
            </Text>
          </Stack>
        </Flex>

        <Stack space={3}>
          {data.slides.map((slide, index) => (
            <SlideCard
              key={slide.kind === 'editorial' ? slide.item._id : slide.item.id}
              slide={slide}
              position={index + 1}
              eventPinned={data.eventPinned}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}
