'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { LazyModule } from '../utilities/lazy-module'
import { useStableEvent } from './use-stable-event'

/** The server has no loaded module, so the server and the hydration render agree. @internal */
const serverModule = () => null

/**
 * How long a browser without `requestIdleCallback` waits after the mount before
 * {@link useIdlePreload} loads. Safari does not have the call. The delay keeps
 * the load after the hydration and the first paint.
 * @internal
 */
const IDLE_FALLBACK_MS = 1000

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

/**
 * Loads a {@link LazyModule} in idle time after the mount, so the first use
 * does not wait for the network. A browser without `requestIdleCallback`, such
 * as Safari, loads after 1 s. The mounts of a module share one idle callback,
 * and an unmount of the last mount before the callback cancels it. A failed
 * load gives no error, and the next mount tries again.
 *
 * @param lazy - The module, or `null` to load nothing.
 * @internal
 */
export function useIdlePreload(lazy: LazyModule<unknown> | null): void {
	useEffect(() => lazy?.idle(IDLE_FALLBACK_MS), [lazy])
}
