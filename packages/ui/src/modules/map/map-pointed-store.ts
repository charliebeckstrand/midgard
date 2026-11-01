import { createEmitter } from '../../utilities'
import type { MapPointedStore } from './context'
import { type MapHoverTarget, sameMark } from './engine/map-hover/target'

/** A {@link MapPointedStore} and its writer. @internal */
export function createPointedStore(): MapPointedStore & {
	publish: (next: MapHoverTarget | null, emphasis: string | null) => void
} {
	let pointed: MapHoverTarget | null = null

	let focus: string | null = null

	const { subscribe, emit } = createEmitter()

	return {
		get: () => pointed,
		emphasis: () => focus,
		subscribe,
		publish: (next, emphasis) => {
			// Pinned at mark granularity: a move to another stop of the same mark
			// keeps the held target, so it publishes nothing.
			const mark = sameMark(pointed, next) ? pointed : next

			if (mark === pointed && emphasis === focus) return

			pointed = mark

			focus = emphasis

			emit()
		},
	}
}
