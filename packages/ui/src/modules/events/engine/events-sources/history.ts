import type { EventSource } from '../types'
import { on } from './dom'

/**
 * Each move through the session history that the browser makes: back,
 * forward, and a change of the hash. A router writes the moves that it makes
 * itself, such as through the navigation callbacks of the router.
 */
export const sessionHistory: EventSource = (note) =>
	on(window, ['popstate', 'hashchange'], (event) =>
		note({ kind: 'route', text: `${event.type} ${location.pathname}${location.hash}` }),
	)
