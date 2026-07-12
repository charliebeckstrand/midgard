import { useMemo, useSyncExternalStore } from 'react'

/** One parsed hash route: `#/<id>?<search>`. */
export type Route = {
	/** Doc id (`components/button`), or `''` on the landing route. */
	id: string

	search: URLSearchParams
}

const subscribe = (notify: () => void) => {
	window.addEventListener('hashchange', notify)

	return () => window.removeEventListener('hashchange', notify)
}

const getSnapshot = () => window.location.hash

/** The current hash route, re-parsed on `hashchange`. */
export function useRoute(): Route {
	const hash = useSyncExternalStore(subscribe, getSnapshot)

	return useMemo(() => {
		const [pathPart = '', query = ''] = hash.replace(/^#/, '').split('?')

		return { id: pathPart.replace(/^\/+/, ''), search: new URLSearchParams(query) }
	}, [hash])
}

/**
 * Navigate to a doc id without the browser's default hash-scroll behavior.
 * `pushState` skips it; the manual `hashchange` event keeps {@link useRoute}
 * subscribers in sync.
 */
export function navigate(id: string) {
	if (window.location.hash.replace(/^#\/?/, '').split('?')[0] === id) return

	history.pushState(null, '', `#/${id}`)

	window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/**
 * Set or clear one query param on the current route in place. Uses
 * `replaceState` so knob changes (tab, seed, level) never pollute history.
 */
export function setParam(key: string, value: string | null) {
	const [pathPart = '', query = ''] = window.location.hash.replace(/^#/, '').split('?')

	const search = new URLSearchParams(query)

	if (value === null) search.delete(key)
	else search.set(key, value)

	const suffix = search.size > 0 ? `?${search}` : ''

	history.replaceState(null, '', `${pathPart === '' ? '#/' : `#${pathPart}`}${suffix}`)

	window.dispatchEvent(new HashChangeEvent('hashchange'))
}
