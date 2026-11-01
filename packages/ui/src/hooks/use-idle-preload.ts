'use client'

import { useEffect } from 'react'
import type { LazyModule } from '../utilities/lazy-module'

/**
 * How long a browser without `requestIdleCallback` waits after the mount before
 * {@link useIdlePreload} loads. Safari does not have the call. The delay keeps
 * the load after the hydration and the first paint.
 * @internal
 */
const IDLE_FALLBACK_MS = 1000

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
