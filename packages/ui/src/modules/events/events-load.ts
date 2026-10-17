import type { LazyModule } from '../../utilities/lazy-module'
import { getEventSink } from './engine/events-sink'

/**
 * Loads a module of the tools while the store is paused, so the store does
 * not record the load of the tools themselves. A load that fails ends the
 * pause. With `hold`, a load that succeeds keeps the pause, because the sheet
 * that loads then holds it while it is open.
 *
 * @remarks Two calls can share one load, such as a preload on hover and the
 * press that follows it. Each call sets the pause when the load resolves, in
 * the order of the calls, so the last call decides. A press thus keeps the
 * pause that a preload before it would end.
 *
 * @internal
 */
export function loadTools<M>(lazy: LazyModule<M>, hold: boolean): Promise<M> {
	const store = getEventSink()?.store

	store?.setPaused(true)

	return lazy.load().then(
		(module) => {
			store?.setPaused(hold)

			return module
		},
		(error: unknown) => {
			store?.setPaused(false)

			throw error
		},
	)
}
