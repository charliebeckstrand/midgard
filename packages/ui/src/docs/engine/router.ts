import { useSyncExternalStore } from 'react'

// Binds the pure route model (`routes.ts`) to the browser: a History-API
// location store plus imperative navigation. The site is a path-routed SPA —
// Vite's dev server and preview both serve the `spa` history fallback, so every
// route resolves to `index.html` and the store below takes over.

// `pushState`/`replaceState` don't fire `popstate`; navigations we initiate
// dispatch this custom event so `usePathname` subscribers stay in sync.
const LOCATION_EVENT = 'docs:locationchange'

// The deploy base with its trailing slash dropped (`''` when served at the
// root), so app-relative paths concatenate cleanly.
const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '')

/** Prefix an app-relative path (`/modules/grid`) with the deploy base for use in `href` and history calls. */
export function withBase(path: string): string {
	return `${BASE}${path}` || '/'
}

/** Strip the deploy base from `location.pathname`, yielding the app-relative path the route model parses. */
export function stripBase(pathname: string): string {
	return BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname
}

const subscribe = (notify: () => void) => {
	window.addEventListener('popstate', notify)

	window.addEventListener(LOCATION_EVENT, notify)

	return () => {
		window.removeEventListener('popstate', notify)

		window.removeEventListener(LOCATION_EVENT, notify)
	}
}

const getSnapshot = () => stripBase(window.location.pathname)

/** The current app-relative pathname; re-renders on back/forward and on {@link navigate}. */
export function usePathname(): string {
	return useSyncExternalStore(subscribe, getSnapshot)
}

/**
 * Navigate to an app-relative path (`/modules/grid/sorting`). Pushes a history
 * entry (or replaces, under `replace`) and notifies {@link usePathname}
 * subscribers; a no-op when already there. Drops any example hash — it
 * anchored the outgoing page.
 */
export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
	if (getSnapshot() === path && !window.location.hash) return

	history[replace ? 'replaceState' : 'pushState'](null, '', withBase(path))

	window.dispatchEvent(new Event(LOCATION_EVENT))
}

/**
 * Set the example-anchor hash on the current history entry without a
 * navigation: `replaceState` skips the browser's default hash jump (the caller
 * owns scrolling, offset under the sticky header) and adds no history entry,
 * so Back still leaves the page. Pass `''` to clear the hash.
 */
export function replaceHash(slug: string) {
	history.replaceState(null, '', `${window.location.pathname}${slug ? `#${slug}` : ''}`)
}
