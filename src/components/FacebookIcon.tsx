/** Facebook mark — path from Simple Icons (simpleicons.org/icons/facebook). */
const FACEBOOK_PATH =
  'M9.101 23.691v-9.105H6.211v-3.75h2.89V7.352c0-2.861 1.742-4.422 4.302-4.422 1.214 0 2.258.09 2.562.131v2.97h-1.758c-1.381 0-1.648.656-1.648 1.618v2.122h3.297l-.429 3.75h-2.869v9.105H9.101z'

export function FacebookIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={FACEBOOK_PATH} />
    </svg>
  )
}
