'use client'

import type {ChangeEvent, ReactNode} from 'react'

import {
  VENUE_RADIUS_OPTIONS,
  VENUE_WHEN_OPTIONS,
  isVenueRadiusMiles,
  type VenueFilterState,
  type VenueWhenFilter,
} from '@/lib/venueFilters'

const labelClass = 'mb-1 block text-sm font-medium text-zinc-300'
const fieldClass =
  'w-full rounded-md border border-zinc-700 bg-zinc-900 py-2 pl-3 text-sm text-zinc-100 outline-none ring-amber-500/40 placeholder:text-zinc-500 focus:ring-2'
const selectClass = `${fieldClass} appearance-none pr-12`

function FilterSelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select id={id} className={selectClass} value={value} onChange={onChange}>
          {children}
        </select>
        <FilterSelectChevron />
      </div>
    </div>
  )
}

export function VenuesMapFilters({
  filters,
  cities,
  resultCount,
  totalCount,
  onChange,
}: {
  filters: VenueFilterState
  cities: string[]
  resultCount: number
  totalCount: number
  onChange: (patch: Partial<Omit<VenueFilterState, 'center'>>) => void
}) {
  const hasActiveFilters =
    filters.radius !== 'all' || filters.city.trim() !== '' || filters.when !== 'anytime'

  const citySelectValue =
    filters.city === '' || cities.includes(filters.city) ? filters.city : ''

  return (
    <section className="mt-4" aria-label="Venue map filters">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          id="venue-filter-radius"
          label="Radius"
          value={String(filters.radius)}
          onChange={(event) => {
            const value = event.target.value
            if (value === 'all') {
              onChange({radius: 'all'})
              return
            }
            const miles = Number.parseInt(value, 10)
            if (isVenueRadiusMiles(miles)) {
              onChange({radius: miles})
            }
          }}
        >
          {VENUE_RADIUS_OPTIONS.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="venue-filter-city"
          label="City"
          value={citySelectValue}
          onChange={(event) => onChange({city: event.target.value})}
        >
          <option value="">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="venue-filter-when"
          label="When"
          value={filters.when}
          onChange={(event) => onChange({when: event.target.value as VenueWhenFilter})}
        >
          {VENUE_WHEN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>

        <div>
          <label htmlFor="venue-filter-clear" className={labelClass}>
            Clear
          </label>
          <button
            id="venue-filter-clear"
            type="button"
            disabled={!hasActiveFilters}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300"
            onClick={() => onChange({radius: 'all', city: '', when: 'anytime'})}
          >
            Clear filters
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        {resultCount} of {totalCount} venues
        {filters.radius !== 'all' ? <span> · within radius of map center</span> : null}
      </p>
    </section>
  )
}
