import type {ReactNode} from 'react'
import Link from 'next/link'

import type {TicketmasterAttractionRef} from '@/lib/spotifyArtistMatch'
import {
  formatTicketmasterDateTime,
  type EventDetail,
  type EventPresale,
} from '@/lib/ticketmaster'
import {venueHref} from '@/lib/paths'

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function PresaleList({presales, timezone}: {presales: EventPresale[]; timezone: string | null}) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
      {presales.map((presale) => {
        const start = formatTicketmasterDateTime(presale.startDateTime, timezone)
        const end = formatTicketmasterDateTime(presale.endDateTime, timezone)
        const when =
          start && end ? `${start} – ${end}` : start ? `From ${start}` : end ? `Until ${end}` : null

        return (
          <li key={`${presale.name}-${presale.startDateTime ?? ''}`}>
            <span className="font-medium text-zinc-300">{presale.name}</span>
            {when ? <span className="mt-0.5 block text-zinc-500">{when}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

export function EventDetailExtra({
  detail,
  venueSlug,
  attractions,
}: {
  detail: EventDetail
  venueSlug: string | null
  attractions: TicketmasterAttractionRef[]
}) {
  const salesStart = formatTicketmasterDateTime(detail.salesPublicStart, detail.timezone)
  const salesEnd = formatTicketmasterDateTime(detail.salesPublicEnd, detail.timezone)
  const salesWindow =
    salesStart && salesEnd
      ? `${salesStart} – ${salesEnd}`
      : salesStart
        ? `From ${salesStart}`
        : salesEnd
          ? `Until ${salesEnd}`
          : null

  const showStatus =
    detail.statusLabel && detail.statusLabel.toLowerCase() !== 'on sale'

  const hasMeta =
    showStatus ||
    detail.genreLabels.length > 0 ||
    detail.eventTypeLabel ||
    detail.promoterNames.length > 0

  const hasLineup = attractions.length > 0
  const hasSales = Boolean(salesWindow || detail.presales.length)

  return (
    <div className="space-y-10">
      {hasMeta ? (
        <DetailSection title="Event details">
          <dl className="space-y-3 text-sm text-zinc-400">
            {showStatus ? (
              <div>
                <dt className="sr-only">Status</dt>
                <dd className="font-medium text-amber-200">{detail.statusLabel}</dd>
              </div>
            ) : null}
            {detail.genreLabels.length ? (
              <div>
                <dt className="text-zinc-500">Genre</dt>
                <dd className="mt-1 text-zinc-300">{detail.genreLabels.join(' · ')}</dd>
              </div>
            ) : null}
            {detail.eventTypeLabel ? (
              <div>
                <dt className="text-zinc-500">Type</dt>
                <dd className="mt-1 text-zinc-300">{detail.eventTypeLabel}</dd>
              </div>
            ) : null}
            {detail.promoterNames.length ? (
              <div>
                <dt className="text-zinc-500">Promoter</dt>
                <dd className="mt-1 text-zinc-300">{detail.promoterNames.join(' · ')}</dd>
              </div>
            ) : null}
          </dl>
        </DetailSection>
      ) : null}

      {hasLineup ? (
        <DetailSection title="Lineup">
          <ul className="space-y-2 text-sm text-zinc-300">
            {attractions.map((attraction) => (
              <li key={attraction.id}>
                {attraction.url ? (
                  <a
                    href={attraction.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-amber-200"
                  >
                    {attraction.name}
                  </a>
                ) : (
                  attraction.name
                )}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {detail.info ? (
        <DetailSection title="About">
          <p className="text-lg leading-relaxed text-zinc-300 whitespace-pre-line">{detail.info}</p>
        </DetailSection>
      ) : null}

      {detail.description ? (
        <DetailSection title="Description">
          <p className="text-lg leading-relaxed text-zinc-300 whitespace-pre-line">
            {detail.description}
          </p>
        </DetailSection>
      ) : null}

      {detail.venueAddress ? (
        <DetailSection title="Venue">
          <p className="text-sm leading-relaxed text-zinc-400">{detail.venueAddress}</p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {venueSlug ? (
              <Link
                href={venueHref(venueSlug)}
                className="font-medium text-amber-300 transition hover:text-amber-200"
              >
                Venue page
              </Link>
            ) : null}
            {detail.venueUrl ? (
              <a
                href={detail.venueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition hover:text-amber-200"
              >
                On Ticketmaster
              </a>
            ) : null}
          </p>
        </DetailSection>
      ) : null}

      {hasSales ? (
        <DetailSection title="Tickets">
          {salesWindow ? (
            <p className="text-sm leading-relaxed text-zinc-400">
              <span className="text-zinc-500">Public on sale: </span>
              {salesWindow}
            </p>
          ) : null}
          {detail.presales.length ? (
            <div className={salesWindow ? 'mt-4' : undefined}>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Presales</p>
              <div className="mt-2">
                <PresaleList presales={detail.presales} timezone={detail.timezone} />
              </div>
            </div>
          ) : null}
        </DetailSection>
      ) : null}

      {detail.ticketLimitInfo ? (
        <DetailSection title="Ticket limit">
          <p className="text-sm leading-relaxed text-zinc-400">{detail.ticketLimitInfo}</p>
        </DetailSection>
      ) : null}

      {detail.accessibilityInfo ? (
        <DetailSection title="Accessibility">
          <p className="text-sm leading-relaxed text-zinc-400 whitespace-pre-line">
            {detail.accessibilityInfo}
          </p>
        </DetailSection>
      ) : null}

      {detail.pleaseNote ? (
        <DetailSection title="Please note">
          <p className="text-lg leading-relaxed text-zinc-300 whitespace-pre-line">
            {detail.pleaseNote}
          </p>
        </DetailSection>
      ) : null}
    </div>
  )
}
