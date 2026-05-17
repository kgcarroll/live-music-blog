import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-300">404</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">Page not found</h1>
      <p className="mt-4 text-zinc-400">
        The page you’re looking for doesn’t exist, may have moved, or may have been removed.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          Back to home
        </Link>
        <Link
          href="/search"
          className="rounded-md border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-amber-500/60 hover:text-amber-200"
        >
          Search the site
        </Link>
      </div>
    </div>
  )
}
