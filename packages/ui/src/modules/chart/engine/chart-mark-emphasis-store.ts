import { createEmitter } from '../../../utilities/emitter'
import type { ChartMarkEmphasis, ChartMarkEmphasisStore } from './context'

/**
 * A new {@link ChartMarkEmphasisStore} that holds `initial`.
 *
 * @remarks A write of the emphasis that the store holds calls no listener.
 * @internal
 */
export function createChartMarkEmphasisStore(initial: ChartMarkEmphasis): ChartMarkEmphasisStore {
	let emphasis = initial

	const { subscribe, emit } = createEmitter()

	return {
		get: () => emphasis,
		set: (next) => {
			if (next === emphasis) return

			emphasis = next

			emit()
		},
		subscribe,
	}
}
