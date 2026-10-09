import { createListenerRegistry } from './listener-registry'

/** The media query that matches when the reader asks the platform for reduced motion. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * The media query that matches a device with no hover, such as a phone. It asks
 * for the device with no hover, so an environment that matches nothing, such as
 * jsdom, takes the path of a device with hover.
 */
export const NO_HOVER_QUERY = '(hover: none)'

/**
 * The media query that matches a device where no pointer hovers, such as a
 * phone with no mouse. Such a device shows no cursor. An environment that
 * matches nothing, such as jsdom, takes the path of a device with a cursor.
 */
export const NO_CURSOR_QUERY = '(any-hover: none)'

const registry = createListenerRegistry<MediaQueryList, MediaQueryListEvent>({
	source: (query) => window.matchMedia(query),
	attach: (mql, _query, listener) => {
		mql.addEventListener('change', listener)

		return () => mql.removeEventListener('change', listener)
	},
})

/**
 * Subscribe to a media query through a single shared `MediaQueryList` per query
 * string. N components watching the same breakpoint (or `(hover: hover)` behind
 * every tooltip) share one `MediaQueryList` and one `change` listener instead of
 * each holding its own. The shared pair is created for the first subscriber and
 * dropped when the last leaves.
 *
 * Handlers fire in subscription order and every subscriber is notified. Returns
 * an unsubscribe fn. `handler` must be a distinct function reference per
 * subscription (callers pass a fresh closure per effect run). Call only on the
 * client — `window.matchMedia` is absent during SSR.
 */
export function subscribeMediaQuery(query: string, handler: () => void): () => void {
	return registry.subscribe(query, handler)
}

/**
 * Whether `query` currently matches, read from the shared `MediaQueryList` while
 * a subscription is live and a transient match otherwise. Call only on the
 * client — `window.matchMedia` is absent during SSR.
 */
export function matchesMediaQuery(query: string): boolean {
	return (registry.source(query) ?? window.matchMedia(query)).matches
}
