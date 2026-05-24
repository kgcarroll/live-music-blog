'use client'

import {CalendarIcon, LaunchIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'

export type HomepageCarouselEventPanelOptions = {
  name: string
  slug: string
  when: string
  venue: string | null
  imageUrl: string | null
  pinned: boolean
}

type Props = {
  options?: Record<string, unknown>
}

export function HomepageCarouselEventPanel({options}: Props) {
  const panel = options as HomepageCarouselEventPanelOptions | undefined
  if (!panel?.name || !panel?.slug) {
    return (
      <Box padding={4}>
        <Text size={1} muted>
          Concert slide details are unavailable.
        </Text>
      </Box>
    )
  }

  const {name, slug, when, venue, imageUrl, pinned} = panel
  const siteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/events/${slug}` : `/events/${slug}`

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Text size={1} weight="semibold">
          {pinned ? 'Pinned homepage concert slide' : 'Random homepage concert slide'}
        </Text>
        <Text size={1} muted>
          This show comes from Ticketmaster, not a Sanity post. It appears in the homepage carousel
          mix on the live site. {pinned ? 'Change or clear the pin in Site Settings.' : 'Pin a specific show in Site Settings, or leave unset for a random pick each day.'}
        </Text>

        <Card padding={3} radius={2} border>
          <Flex gap={3} align="flex-start">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN thumbnail
              <img
                src={imageUrl}
                alt=""
                width={96}
                height={96}
                className="size-24 shrink-0 rounded object-cover"
              />
            ) : (
              <Flex
                align="center"
                justify="center"
                className="size-24 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800"
              >
                <Text muted>
                  <CalendarIcon />
                </Text>
              </Flex>
            )}
            <Stack space={2} flex={1}>
              <Text size={2} weight="semibold">
                {name}
              </Text>
              <Text size={1} muted>
                {when}
                {venue ? ` · ${venue}` : ''}
              </Text>
              <Text size={0} muted>
                /events/{slug}
              </Text>
            </Stack>
          </Flex>
        </Card>

        <Flex gap={2} wrap="wrap">
          <Button
            as="a"
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            text="View on site"
            icon={LaunchIcon}
            mode="default"
          />
        </Flex>
      </Stack>
    </Box>
  )
}
