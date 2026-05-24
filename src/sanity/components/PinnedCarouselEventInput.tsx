'use client'

import {SearchIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, TextInput} from '@sanity/ui'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {set, unset, type StringInputProps} from 'sanity'

import type {StudioCarouselEventOption} from '@/lib/studioCarouselEvents'

function studioApiOrigin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function PinnedCarouselEventInput(props: StringInputProps) {
  const {value, onChange, readOnly} = props
  const [events, setEvents] = useState<StudioCarouselEventOption[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const response = await fetch(`${studioApiOrigin()}/api/studio/carousel-events`)
        const body = (await response.json()) as {
          events?: StudioCarouselEventOption[]
          error?: string
        }
        if (!response.ok) {
          const message =
            body.error === 'not_configured'
              ? 'Ticketmaster is not configured on this environment.'
              : 'Could not load upcoming events.'
          if (!cancelled) setFetchError(message)
          return
        }
        if (!cancelled) setEvents(body.events ?? [])
      } catch {
        if (!cancelled) setFetchError('Could not load upcoming events.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const selected = useMemo(
    () => events.find((event) => event.slug === value) ?? null,
    [events, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter((event) => {
      const haystack = [event.name, event.slug, event.when, event.venue ?? '']
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [events, query])

  const select = useCallback(
    (slug: string) => {
      if (readOnly) return
      onChange(set(slug))
    },
    [onChange, readOnly],
  )

  const clear = useCallback(() => {
    if (readOnly) return
    onChange(unset())
  }, [onChange, readOnly])

  return (
    <Stack space={3}>
      {loading ? (
        <Flex align="center" gap={3} padding={3}>
          <Spinner />
          <Text size={1} muted>
            Loading upcoming concerts…
          </Text>
        </Flex>
      ) : null}

      {fetchError ? (
        <Card padding={3} radius={2} tone="critical" border>
          <Text size={1}>{fetchError}</Text>
        </Card>
      ) : null}

      {!loading && !fetchError ? (
        <>
          {selected ? (
            <Card padding={3} radius={2} border tone="positive">
              <Flex gap={3} align="flex-start">
                {/* eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN thumbnail */}
                <img
                  src={selected.imageUrl}
                  alt=""
                  width={72}
                  height={72}
                  className="size-[72px] shrink-0 rounded object-cover"
                />
                <Stack space={2} flex={1}>
                  <Text size={1} weight="semibold">
                    {selected.name}
                  </Text>
                  <Text size={1} muted>
                    {selected.when}
                    {selected.venue ? ` · ${selected.venue}` : ''}
                  </Text>
                  <Text size={0} muted>
                    /events/{selected.slug}
                  </Text>
                  {!readOnly ? (
                    <Button text="Clear selection" mode="bleed" tone="critical" onClick={clear} />
                  ) : null}
                </Stack>
              </Flex>
            </Card>
          ) : (
            <Text size={1} muted>
              No concert pinned — the homepage uses a random upcoming show each day.
            </Text>
          )}

          <TextInput
            icon={SearchIcon}
            placeholder="Search by artist, venue, or date…"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            disabled={readOnly}
          />

          <Box style={{maxHeight: '18rem', overflowY: 'auto'}}>
            <Stack space={2}>
              {filtered.length === 0 ? (
                <Card padding={3} radius={2} border>
                  <Text size={1} muted>
                    {events.length === 0
                      ? 'No upcoming concerts with images in the current window.'
                      : 'No matches for that search.'}
                  </Text>
                </Card>
              ) : (
                filtered.map((event) => {
                  const isSelected = event.slug === value
                  return (
                    <Card
                      key={event.slug}
                      padding={2}
                      radius={2}
                      border
                      tone={isSelected ? 'positive' : 'default'}
                      style={{cursor: readOnly ? 'default' : 'pointer'}}
                      onClick={() => select(event.slug)}
                    >
                      <Flex gap={3} align="center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN thumbnail */}
                        <img
                          src={event.imageUrl}
                          alt=""
                          width={56}
                          height={56}
                          className="size-14 shrink-0 rounded object-cover"
                        />
                        <Stack space={2} flex={1}>
                          <Text size={1} weight="semibold">
                            {event.name}
                          </Text>
                          <Text size={0} muted>
                            {event.when}
                            {event.venue ? ` · ${event.venue}` : ''}
                          </Text>
                        </Stack>
                      </Flex>
                    </Card>
                  )
                })
              )}
            </Stack>
          </Box>
        </>
      ) : null}
    </Stack>
  )
}
