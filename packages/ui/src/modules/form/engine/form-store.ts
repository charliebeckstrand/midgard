import type { FormStateValue, FormStore } from '../../../primitives/form/context'
import { createEmitter } from '../../../utilities'

/**
 * Makes the store for one form, and the function that publishes a committed
 * state to it. Both `state` and `server` start from the first state, so SSR,
 * hydration, and the first client render share one snapshot.
 *
 * @internal
 */
export function createFormStore(initial: FormStateValue): {
	store: FormStore
	publish: (state: FormStateValue) => void
} {
	let state = initial

	const { subscribe, emit } = createEmitter()

	return {
		store: {
			subscribe,
			getState: () => state,
			getServerState: () => initial,
		},
		publish: (next) => {
			state = next

			emit()
		},
	}
}
