import { createEmitter } from './emitter'

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

	const loaded = createEmitter()

	return {
		load() {
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
		},
		read: () => module,
		subscribe: loaded.subscribe,
	}
}
