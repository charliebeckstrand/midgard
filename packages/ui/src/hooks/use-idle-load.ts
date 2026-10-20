'use client'

import { getOrCompute } from '../utilities/get-or-compute'
import { createLazyModule, type LazyModule } from '../utilities/lazy-module'
import { noop } from '../utilities/noop'
import { useIdlePreload, useLazyModule } from './use-lazy-module'

/** The {@link LazyModule} of each loader, so the mounts of a loader share one load. */
const modules = new WeakMap<() => Promise<unknown>, LazyModule<unknown>>()

/** The module of a `null` loader, which never loads. */
const nothing = createLazyModule<never>(() => new Promise(noop))

/**
 * The {@link LazyModule} of `load`. Each call with the same loader gets the same
 * module.
 * @internal
 */
export function getLazyModule<T>(load: () => Promise<T>): LazyModule<T> {
	// The map holds the module that `load` makes, which loads a `T`.
	return getOrCompute(modules, load, createLazyModule) as LazyModule<T>
}

/**
 * Loads a value in idle time after the mount, and gives it when it resolves.
 * Use it to fetch the code of a surface that opens later, such as a menu or a
 * dialog. The first open then does not wait for the network.
 *
 * @remarks
 * The load starts in an idle callback after the hydration, so it stays off the
 * critical path. A browser without `requestIdleCallback`, such as Safari, loads
 * after 1 s. An unmount before the callback cancels it.
 *
 * Each loader loads one time. The mounts that share a loader share one idle
 * callback and one load. A mount after the load gets the value in its first
 * render, but the hydration render gets `undefined`. A failed load gives no
 * value and no error. The next mount tries again, and a load on intent, such as
 * a press, reports the error.
 *
 * {@link useIntentLoad} shares the load of the same loader, so a preload on a
 * pointer or a focus gives the value to each mount.
 * @param load - The load, such as `() => import('./panel')`. It must keep its
 *   identity: declare it at module scope. `null` schedules nothing, for a
 *   caller that has the value from another source.
 * @returns The resolved value, or `undefined` before the load resolves.
 * @example
 * ```tsx
 * const loadPanel = () => import('./panel')
 *
 * function Trigger() {
 *   const panel = useIdleLoad(loadPanel)
 *
 *   return panel && <panel.Panel open={false} />
 * }
 * ```
 */
export function useIdleLoad<T>(load: (() => Promise<T>) | null): T | undefined {
	const lazy = load === null ? null : getLazyModule(load)

	useIdlePreload(lazy)

	return useLazyModule(lazy ?? nothing, false) ?? undefined
}
