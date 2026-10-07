'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'

/**
 * A module of the grid that loads on use, and the state of its load. A page
 * shares one load for each module, so each grid after the first gets the
 * module at once.
 *
 * @internal
 */
export type GridLazyModule<M> = {
	/** Starts the load, or gets the load in flight or resolved. */
	load: () => Promise<M>
	/** The loaded module, or `null` until the load resolves. */
	read: () => M | null
	/** Subscribes to the load, for `useSyncExternalStore`. */
	subscribe: (listener: () => void) => () => void
}

/**
 * Makes a {@link GridLazyModule} from a dynamic import. The first `load` starts
 * the import, and each later `load` gets the same promise. A load that fails is
 * forgotten, so the next `load` tries again.
 *
 * @internal
 */
export function gridLazyModule<M>(importer: () => Promise<M>): GridLazyModule<M> {
	let module: M | null = null

	let pending: Promise<M> | null = null

	const listeners = new Set<() => void>()

	return {
		load() {
			pending ??= importer().then(
				(loaded) => {
					module = loaded

					for (const listener of listeners) listener()

					return loaded
				},
				(error: unknown) => {
					pending = null

					throw error
				},
			)

			return pending
		},
		read: () => module,
		subscribe(listener) {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
	}
}

/** The server has no loaded module, so the server and the hydration render agree. @internal */
const serverModule = () => null

/**
 * Reads a {@link GridLazyModule}, and loads it while `wanted` is true. It gives
 * `null` until the module is loaded, and the module after that, also when
 * `wanted` becomes false.
 *
 * @param onError - Runs when the load fails. The error then goes on as an
 * unhandled rejection, so it reaches the error reporting of the app.
 * @internal
 */
export function useGridLazyModule<M>(
	lazy: GridLazyModule<M>,
	wanted: boolean,
	onError?: () => void,
): M | null {
	const module = useSyncExternalStore(lazy.subscribe, lazy.read, serverModule)

	const missing = wanted && module === null

	const fail = useStableEvent(() => onError?.())

	useEffect(() => {
		if (!missing) return

		lazy.load().catch((error: unknown) => {
			fail()

			throw error
		})
	}, [lazy, missing, fail])

	return module
}
