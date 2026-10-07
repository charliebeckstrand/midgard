'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { cancelIdle, requestIdle } from '../utilities/idle'
import { noop } from '../utilities/noop'

/**
 * How long a browser without `requestIdleCallback` waits after the mount before
 * it loads. Safari does not have the call. The delay keeps the load after the
 * hydration and the first paint.
 */
const IDLE_FALLBACK_MS = 1000

/** A function that loads a value, such as the dynamic import of a module. */
type Load = () => Promise<unknown>

/**
 * The scheduled load of one loader: the idle callback, or `null` when the
 * load runs, and the mounts that wait for the value.
 */
type Waiters = { handle: number | null; listeners: Set<() => void> }

/** The value of each loader that resolved, in a box, so that a value of `undefined` counts. */
const loaded = new WeakMap<Load, { value: unknown }>()

/** The scheduled load of each loader that did not resolve. */
const waiting = new Map<Load, Waiters>()

/** The server and the hydration render have no value, so they agree. */
const serverSnapshot = () => undefined

/**
 * Adds `listener` to the scheduled load of `load`. The first listener
 * schedules the load in idle time. A loader that resolved schedules nothing.
 * A failed load leaves the map, so the next mount schedules it again.
 *
 * @returns The removal of the listener. The removal of the last listener
 *   before the idle callback runs cancels the callback.
 */
function schedule(load: Load, listener: () => void): () => void {
	if (loaded.has(load)) return noop

	let entry = waiting.get(load)

	if (entry === undefined) {
		const created: Waiters = { handle: null, listeners: new Set() }

		created.handle = requestIdle(() => {
			created.handle = null

			load().then(
				(value) => {
					loaded.set(load, { value })

					waiting.delete(load)

					for (const notify of created.listeners) notify()
				},
				() => {
					if (waiting.get(load) === created) waiting.delete(load)
				},
			)
		}, IDLE_FALLBACK_MS)

		waiting.set(load, created)

		entry = created
	}

	const held = entry

	held.listeners.add(listener)

	return () => {
		held.listeners.delete(listener)

		if (held.listeners.size > 0 || held.handle === null) return

		cancelIdle(held.handle)

		waiting.delete(load)
	}
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
 * A preload on a pointer or a focus can still start the load before the idle
 * callback. The two loads must resolve to the same value, as a dynamic import
 * does.
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
	const subscribe = useCallback(
		(listener: () => void) => (load === null ? noop : schedule(load, listener)),
		[load],
	)

	const snapshot = useCallback(() => (load === null ? undefined : loaded.get(load)), [load])

	const box = useSyncExternalStore(subscribe, snapshot, serverSnapshot)

	// The map holds the value that `load` resolved to, which is a `T`.
	return box?.value as T | undefined
}
