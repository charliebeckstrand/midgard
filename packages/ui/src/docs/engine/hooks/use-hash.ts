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

	history.pushState(null, '', `#${id}`)

	window.dispatchEvent(new HashChangeEvent('hashchange'))
}
