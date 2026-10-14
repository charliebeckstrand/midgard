import { viewport as readViewport } from '../events-probes'
import type { EventSource } from '../types'
import { all, bursts, on } from './dom'

/**
 * Each resize of the window and of the visual viewport, with the reading of
 * the viewport. A burst of resizes is one batch.
 */
export const resize: EventSource = (note) => {
	const { batchOf, stop } = bursts()

	return all([
		on(window, ['resize'], () =>
			note({
				kind: 'viewport',
				text: 'window resize',
				detail: readViewport(),
				batch: batchOf('resize'),
			}),
		),
		on(window.visualViewport, ['resize'], () =>
			note({
				kind: 'viewport',
				text: 'visual resize',
				detail: readViewport(),
				batch: batchOf('resize'),
			}),
		),
		stop,
	])
}

/** Each change of the height of the page. */
export const height: EventSource = (note) => {
	let prev = 0

	const observer = new ResizeObserver(() => {
		if (document.documentElement.scrollHeight === prev) return

		prev = document.documentElement.scrollHeight

		note({ kind: 'viewport', text: `page height ${prev}` })
	})

	observer.observe(document.documentElement)

	return () => observer.disconnect()
}
