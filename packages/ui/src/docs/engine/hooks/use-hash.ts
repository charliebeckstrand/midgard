import { useSyncExternalStore } from 'react'
import { defaultDemo } from '../registry'

const subscribe = (notify: () => void) => {
	window.addEventListener('hashchange', notify)

	return () => window.removeEventListener('hashchange', notify)
}

const getSnapshot = () => window.location.hash.slice(1) || defaultDemo

/** The current URL hash (without the leading `#`), or {@link defaultDemo} when empty; re-renders on `hashchange`. */
export function useHash() {
	return useSyncExternalStore(subscribe, getSnapshot)
}

/**
 * Set the URL hash to `id` without the browser's default scroll-to-element (or
 * scroll-to-top when no element matches). `pushState` skips that behavior; the
 * manual `hashchange` event keeps {@link useHash} subscribers in sync.
 */
export function navigate(id: string) {
	if (window.location.hash.slice(1) === id) return

	// The null state is load-bearing: the host's preload-error recovery re-arms
	// on entries whose history.state is not its reload marker (host.tsx).
	history.pushState(null, '', `#${id}`)

	// The scroll restoration mode belongs to a history entry. `mount` sets it on
	// the first entry (host.tsx). On Chrome for iOS, a reload of an entry that
	// `pushState` made restores a position below the top, while a reload of the
	// first entry opens at the top. Thus set the mode on each new entry too. The
	// HTML standard copies the mode to the new entry, so where a browser does
	// that, this line changes nothing.
	history.scrollRestoration = 'manual'

	window.dispatchEvent(new HashChangeEvent('hashchange'))
}
