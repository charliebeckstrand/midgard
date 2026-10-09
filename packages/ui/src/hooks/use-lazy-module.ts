'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { LazyModule } from '../utilities/lazy-module'
import { useStableEvent } from './use-stable-event'

/** The server has no loaded module, so the server and the hydration render agree. @internal */
const serverModule = () => null

/**
 * Reads a {@link LazyModule}, and loads it while `wanted` is true. It gives
 * `null` until the module is loaded, and the module after that, also when
 * `wanted` becomes false.
 *
 * @param onError - Runs when the load fails. The error then goes on as an
 * unhandled rejection, so it reaches the error reporting of the app.
 * @internal
 */
export function useLazyModule<M>(
	lazy: LazyModule<M>,
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
