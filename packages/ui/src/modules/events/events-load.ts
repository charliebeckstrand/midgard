import type { LazyModule } from '../../utilities/lazy-module'
import { getEventSink } from './engine/events-sink'

/**
 * Loads a module of the tools while the store is paused, so the store does
 * not record the load of the tools themselves. A load that fails ends the
 * pause. With `hold`, a load that succeeds keeps the pause, because the sheet
 * that loads then holds it while it is open.
 *
 * @internal
 */
export function loadTools<M>(lazy: LazyModule<M>, hold: boolean): Promise<M> {
	const store = getEventSink()?.store

	store?.setPaused(true)

	return lazy.load().then(
		(module) => {
			if (!hold) store?.setPaused(false)

			return module
		},
		(error: unknown) => {
			store?.setPaused(false)

			throw error
		},
	)
}
