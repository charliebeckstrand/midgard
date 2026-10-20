import { isOwn, targetNameOf } from '../events-target'
import type { EventSource } from '../types'
import { addListeners, nextBatch, QUIET } from './dom'

/** The start and the end of each scroll, as one batch. */
export const scroll: EventSource = (note) => {
	let scrolling: ReturnType<typeof setTimeout> | undefined

	let batch = ''

	const stop = addListeners(document, ['scroll'], (event) => {
		if (isOwn(event.target)) return

		if (!scrolling) {
			batch = nextBatch()

			note({ kind: 'scroll', text: `scroll starts ${targetNameOf(event.target)}`, batch })
		}

		clearTimeout(scrolling)

		scrolling = setTimeout(() => {
			scrolling = undefined

			note({ kind: 'scroll', text: 'scroll ends', batch })
		}, QUIET)
	})

	return () => {
		stop()

		clearTimeout(scrolling)
	}
}
