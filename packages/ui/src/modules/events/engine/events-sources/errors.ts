import { targetNameOf } from '../events-target'
import type { EventSource } from '../types'
import { addListeners, all } from './dom'

/** The URL that an element loads, as its `src` or `href` attribute gives it. */
function resourceOf(target: unknown): string {
	if (!(target instanceof Element)) return ''

	return target.getAttribute('src') ?? target.getAttribute('href') ?? ''
}

/**
 * The bugs that reach `window`: the uncaught errors, the resources that fail
 * to load, and the unhandled rejections. An error that a React root reports
 * to `window` after its own callback is the same thrown value, so the store
 * adds it to the report of that callback.
 */
export const errors: EventSource = (note) =>
	all([
		// The capture phase also gets the `error` of an element whose resource fails to load, such as a `<script>`.
		addListeners(window, ['error'], (event) => {
			if (event instanceof ErrorEvent)
				note({ kind: 'error', text: event.message, bug: { origin: 'window', error: event.error } })
			else
				note({
					kind: 'error',
					text: `load fails ${targetNameOf(event.target)} ${resourceOf(event.target)}`,
					bug: { origin: 'window' },
				})
		}),
		addListeners(window, ['unhandledrejection'], (event) => {
			const { reason } = event as PromiseRejectionEvent

			note({
				kind: 'error',
				text: `unhandled rejection ${String(reason)}`,
				bug: { origin: 'window', error: reason },
			})
		}),
	])
