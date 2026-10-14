import { viewport } from '../events-probes'
import type { EventSource } from '../types'
import { all, on } from './dom'

/**
 * The page lifecycle: each show, hide, and change of the visibility. A
 * restore from the back-forward cache keeps the store, so it writes a
 * separator and the reading of the viewport, as the start of a page load
 * does.
 */
export const lifecycle: EventSource = (note) =>
	all([
		on(window, ['pageshow', 'pagehide'], (event) => {
			const { persisted } = event as PageTransitionEvent

			if (event.type === 'pageshow' && persisted) {
				note({ kind: 'load', text: `──── back-forward cache ${location.pathname}` })

				note({ kind: 'load', text: 'viewport', detail: viewport() })
			} else {
				note({ kind: 'load', text: `${event.type}${persisted ? ' persisted' : ''}` })
			}
		}),
		on(document, ['visibilitychange'], () =>
			note({ kind: 'load', text: `visibility ${document.visibilityState}` }),
		),
	])
