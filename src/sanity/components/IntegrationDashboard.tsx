'use client'

import {ActivityIcon} from '@sanity/icons'
import {Box, Flex, Stack, Tab, TabList, Text} from '@sanity/ui'
import {useState} from 'react'

import {AlgoliaUsagePanel} from '@/sanity/components/AlgoliaUsagePanel'
import {GooglePlacesUsagePanel} from '@/sanity/components/GooglePlacesUsagePanel'
import {MapboxUsagePanel} from '@/sanity/components/MapboxUsagePanel'
import {OpenAIUsagePanel} from '@/sanity/components/OpenAIUsagePanel'
import {ResendUsagePanel} from '@/sanity/components/ResendUsagePanel'
import {SpotifyUsagePanel} from '@/sanity/components/SpotifyUsagePanel'
import {TicketmasterFeedDesk} from '@/sanity/components/TicketmasterFeedDesk'

type IntegrationTab =
  | 'ticketmaster'
  | 'openai'
  | 'mapbox'
  | 'google'
  | 'algolia'
  | 'resend'
  | 'spotify'

export function IntegrationDashboard() {
  const [tab, setTab] = useState<IntegrationTab>('ticketmaster')

  return (
    <Box padding={4} sizing="border">
      <Stack space={4}>
        <Flex align="center" gap={2}>
          <ActivityIcon />
          <Text size={2} weight="semibold">
            Integration Dashboard
          </Text>
        </Flex>

        <TabList space={2}>
          <Tab
            aria-controls="integration-ticketmaster"
            id="integration-tab-ticketmaster"
            label="Ticketmaster"
            onClick={() => setTab('ticketmaster')}
            selected={tab === 'ticketmaster'}
          />
          <Tab
            aria-controls="integration-openai"
            id="integration-tab-openai"
            label="OpenAI"
            onClick={() => setTab('openai')}
            selected={tab === 'openai'}
          />
          <Tab
            aria-controls="integration-mapbox"
            id="integration-tab-mapbox"
            label="Mapbox"
            onClick={() => setTab('mapbox')}
            selected={tab === 'mapbox'}
          />
          <Tab
            aria-controls="integration-google"
            id="integration-tab-google"
            label="Google Places"
            onClick={() => setTab('google')}
            selected={tab === 'google'}
          />
          <Tab
            aria-controls="integration-algolia"
            id="integration-tab-algolia"
            label="Algolia"
            onClick={() => setTab('algolia')}
            selected={tab === 'algolia'}
          />
          <Tab
            aria-controls="integration-resend"
            id="integration-tab-resend"
            label="Resend"
            onClick={() => setTab('resend')}
            selected={tab === 'resend'}
          />
          <Tab
            aria-controls="integration-spotify"
            id="integration-tab-spotify"
            label="Spotify"
            onClick={() => setTab('spotify')}
            selected={tab === 'spotify'}
          />
        </TabList>

        {tab === 'ticketmaster' ? (
          <Box id="integration-ticketmaster" aria-labelledby="integration-tab-ticketmaster">
            <TicketmasterFeedDesk embedded />
          </Box>
        ) : tab === 'openai' ? (
          <Box id="integration-openai" aria-labelledby="integration-tab-openai">
            <OpenAIUsagePanel />
          </Box>
        ) : tab === 'mapbox' ? (
          <Box id="integration-mapbox" aria-labelledby="integration-tab-mapbox">
            <MapboxUsagePanel />
          </Box>
        ) : tab === 'google' ? (
          <Box id="integration-google" aria-labelledby="integration-tab-google">
            <GooglePlacesUsagePanel />
          </Box>
        ) : tab === 'algolia' ? (
          <Box id="integration-algolia" aria-labelledby="integration-tab-algolia">
            <AlgoliaUsagePanel />
          </Box>
        ) : tab === 'resend' ? (
          <Box id="integration-resend" aria-labelledby="integration-tab-resend">
            <ResendUsagePanel />
          </Box>
        ) : (
          <Box id="integration-spotify" aria-labelledby="integration-tab-spotify">
            <SpotifyUsagePanel />
          </Box>
        )}
      </Stack>
    </Box>
  )
}
