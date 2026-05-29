import type {TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'

export type EventSpotifyCurationInput = {
  eventId: string
  eventName: string
  venueName: string | null
  genreLabels: string[]
  eventTypeLabel: string | null
  info: string | null
  attractions: TicketmasterAttractionRef[]
}

export type CuratedSpotifyArtist = {
  ticketmasterAttractionId: string
  attractionName: string
  displayOrder: number
  includeEmbed: boolean
  spotifySearchQuery: string | null
  skipReason: string | null
}

export const SPOTIFY_CURATION_INSTRUCTIONS = `You curate Spotify artist embeds for live music events on a Philadelphia concert blog.

Given an event and its Ticketmaster lineup (attractions), return a curation for each attraction:
- displayOrder: 1 = headliner / top billing; higher numbers = support acts
- includeEmbed: true only for musical artists or groups with a realistic Spotify artist page
- spotifySearchQuery: when includeEmbed is true, a specific Spotify search string (stage name); null when false
- skipReason: when includeEmbed is false, brief reason (e.g. comedian, host, tribute experience, not a music artist)

Rules:
- Use the event title for billing ("X Presents: Y" → X is usually headliner; Y may be a comedian or co-headliner)
- Skip comedians, podcast hosts, generic hosts, and "experience/tribute" acts unless they are primarily known as recording musicians
- Short ambiguous names need event context (e.g. "Delirious" at a comedy show is not the band "Delirious?")
- Prefer separate listed performers over festival or series names when both appear
- Every input attraction must appear exactly once in the output

Return only valid JSON: { "artists": [ { "ticketmasterAttractionId", "displayOrder", "includeEmbed", "spotifySearchQuery", "skipReason" } ] }`

type OpenAIChatResponse = {
  choices?: {message?: {content?: string}}[]
  error?: {message?: string}
}

type OpenAICurationJson = {
  artists?: {
    ticketmasterAttractionId?: string
    displayOrder?: number
    includeEmbed?: boolean
    spotifySearchQuery?: string | null
    skipReason?: string | null
  }[]
}

function parseCurationJson(raw: string): OpenAICurationJson {
  try {
    return JSON.parse(raw) as OpenAICurationJson
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('OpenAI returned invalid Spotify curation JSON.')
    return JSON.parse(match[0]) as OpenAICurationJson
  }
}

function curateSingleArtist(attraction: TicketmasterAttractionRef): CuratedSpotifyArtist {
  return {
    ticketmasterAttractionId: attraction.id,
    attractionName: attraction.name,
    displayOrder: 1,
    includeEmbed: true,
    spotifySearchQuery: attraction.name,
    skipReason: null,
  }
}

function normalizeCurationRow(
  row: NonNullable<OpenAICurationJson['artists']>[number],
  byId: Map<string, TicketmasterAttractionRef>,
): CuratedSpotifyArtist | null {
  const id = row.ticketmasterAttractionId?.trim()
  if (!id) return null
  const attraction = byId.get(id)
  if (!attraction) return null

  const includeEmbed = row.includeEmbed === true
  const query = row.spotifySearchQuery?.trim() || null
  const skipReason = row.skipReason?.trim() || null
  const displayOrder =
    typeof row.displayOrder === 'number' && row.displayOrder > 0
      ? Math.floor(row.displayOrder)
      : 99

  if (includeEmbed && !query) return null

  return {
    ticketmasterAttractionId: id,
    attractionName: attraction.name,
    displayOrder,
    includeEmbed,
    spotifySearchQuery: includeEmbed ? query : null,
    skipReason: includeEmbed ? null : skipReason || 'Not included for Spotify embed',
  }
}

export function isOpenAIConfiguredForCuration(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export async function curateEventSpotifyArtists(
  input: EventSpotifyCurationInput,
): Promise<CuratedSpotifyArtist[]> {
  if (!input.attractions.length) return []
  if (input.attractions.length === 1) {
    return [curateSingleArtist(input.attractions[0]!)]
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return input.attractions.map((attraction, index) => ({
      ticketmasterAttractionId: attraction.id,
      attractionName: attraction.name,
      displayOrder: index + 1,
      includeEmbed: true,
      spotifySearchQuery: attraction.name,
      skipReason: null,
    }))
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const lineup = input.attractions
    .map(
      (attraction, index) =>
        `${index + 1}. id=${attraction.id} name=${JSON.stringify(attraction.name)}`,
    )
    .join('\n')

  const context = [
    `Event: ${input.eventName}`,
    input.venueName ? `Venue: ${input.venueName}` : '',
    input.genreLabels.length ? `Genre: ${input.genreLabels.join(', ')}` : '',
    input.eventTypeLabel ? `Type: ${input.eventTypeLabel}` : '',
    input.info ? `Info: ${input.info.slice(0, 1200)}` : '',
    '',
    'Lineup (Ticketmaster attractions):',
    lineup,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800,
      response_format: {type: 'json_object'},
      messages: [
        {role: 'system', content: SPOTIFY_CURATION_INSTRUCTIONS},
        {role: 'user', content: context},
      ],
    }),
  })

  const data = (await response.json().catch(() => ({}))) as OpenAIChatResponse
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI curation failed (${response.status})`)
  }

  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error('OpenAI returned empty Spotify curation.')

  const parsed = parseCurationJson(raw)
  const byId = new Map(input.attractions.map((attraction) => [attraction.id, attraction]))
  const curated = (parsed.artists ?? [])
    .map((row) => normalizeCurationRow(row, byId))
    .filter((row): row is CuratedSpotifyArtist => row != null)

  if (curated.length !== input.attractions.length) {
    throw new Error('OpenAI curation missing one or more attractions.')
  }

  return curated.sort((a, b) => a.displayOrder - b.displayOrder)
}
