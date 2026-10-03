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
 * Show the demo `id`. The hash replaces the URL of the current history entry,
 * and the browser sends `hashchange`. A switch thus adds no history entry.
 *
 * On Chrome for iOS, a reload of an entry that an in-page switch added opens
 * the page below the top, under the toolbar of the browser. A reload of the
 * entry of a full page load opens at the top, also with a hash in the URL.
 */
export function showDemo(id: string) {
	window.location.replace(`#${id}`)
}
