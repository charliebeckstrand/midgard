import { createEmitter } from '../../../utilities'
import { type ChartHoverState, type ChartHoverStore, samePoint } from './context'

/**
 * A new {@link ChartHoverStore}, at rest.
 *
 * @remarks A write that changes nothing calls no listener, so the repeated
 * clears of a scroll cost no render.
 * @internal
 */
export function createChartHoverStore(): ChartHoverStore {
	let state: ChartHoverState = { index: null, point: null, onData: false }

	const { subscribe, emit } = createEmitter()

	return {
		get: () => state,
		set: (index, point, onData = true) => {
			if (state.index === index && state.onData === onData && samePoint(state.point, point)) {
				return
			}

			state = { index, point, onData }

			emit()
		},
		subscribe,
	}
}
