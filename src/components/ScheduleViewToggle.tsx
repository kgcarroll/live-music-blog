export type ScheduleViewMode = 'grid' | 'list'

const toggleButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'

function IconGrid({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="0.5" />
      <rect x="14" y="3" width="7" height="7" rx="0.5" />
      <rect x="3" y="14" width="7" height="7" rx="0.5" />
      <rect x="14" y="14" width="7" height="7" rx="0.5" />
    </svg>
  )
}

function IconList({className}: {className?: string}) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export function ScheduleViewToggle({
  view,
  onChange,
}: {
  view: ScheduleViewMode
  onChange: (view: ScheduleViewMode) => void
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-md border border-zinc-700 p-0.5"
      role="group"
      aria-label="Schedule layout"
    >
      <button
        type="button"
        className={`${toggleButtonClass} ${
          view === 'grid' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
        onClick={() => onChange('grid')}
      >
        <IconGrid />
      </button>
      <button
        type="button"
        className={`${toggleButtonClass} ${
          view === 'list' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        aria-pressed={view === 'list'}
        aria-label="List view"
        onClick={() => onChange('list')}
      >
        <IconList />
      </button>
    </div>
  )
}
