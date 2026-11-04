import { createEmitter } from './emitter'
import { cancelIdle, requestIdle } from './idle'
import { noop } from './noop'

/**
 * A module that loads on use, and the state of its load. A page shares one
 * load for each module, so each reader after the first gets the module at once.
 *
 * @internal
 */
export type LazyModule<M> = {
	/** Starts the load, or gets the load in flight or resolved. */
	load: () => Promise<M>
	/** The loaded module, or `null` until the load resolves. */
	read: () => M | null
	/** Subscribes to the load, for `useSyncExternalStore`. */
	subscribe: (listener: () => void) => () => void
	/**
	 * Starts the load in idle time, and gives no error when it fails. A browser
	 * with no `requestIdleCallback` starts it after `fallbackDelay` milliseconds.
	 * The callers share one idle callback. A load in flight or resolved schedules
	 * nothing.
	 *
	 * @returns The release of the call. The release of the last call before the
	 *   idle callback runs cancels the callback.
	 */
	idle: (fallbackDelay: number) => () => void
}

/**
 * Makes a {@link LazyModule} from a dynamic import. The first `load` starts the
 * import, and each later `load` gets the same promise. A load that fails is
 * forgotten, so the next `load` tries again.
 *
 * @internal
 */
export function createLazyModule<M>(importer: () => Promise<M>): LazyModule<M> {
	let module: M | null = null

	let pending: Promise<M> | null = null

	let idleHandle: number | null = null

	let idleCallers = 0

	const loaded = createEmitter()

	const load = () => {
		pending ??= importer().then(
			(value) => {
				module = value

				loaded.emit()

				return value
			},
			(error: unknown) => {
				pending = null

				throw error
			},
		)

		return pending
	}

	return {
		load,
		read: () => module,
		subscribe: loaded.subscribe,
		idle(fallbackDelay) {
			if (pending) return noop

			idleCallers++

			idleHandle ??= requestIdle(() => {
				idleHandle = null

				load().catch(noop)
			}, fallbackDelay)

			return () => {
				idleCallers--

				if (idleCallers > 0 || idleHandle === null) return

				cancelIdle(idleHandle)

				idleHandle = null
			}
		},
	}
}
