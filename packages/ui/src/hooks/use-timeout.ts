'use client'

import { useEffect, useState } from 'react'
import { MAX_TIMEOUT } from '../utilities/time-units'

/** The timer that {@link useTimeout} gives. Each function keeps its identity. */
export type Timeout = {
	/**
	 * Starts the timer. It clears a pending timer first, so the last call wins. A
	 * delay longer than the platform timer holds, such as `Infinity`, fires at
	 * that limit, not at once. A call after the effect cleanup of the component
	 * waits, and the timer starts only when the effect runs again.
	 */
	set: (callback: () => void, ms: number) => void
	/** Clears a pending timer. It does nothing when no timer is pending. */
	clear: () => void
	/** Whether a timer is set and has not fired or been cleared. */
	pending: () => boolean
}

/**
 * One restartable timer that clears on unmount.
 *
 * @returns A {@link Timeout} that keeps its identity.
 * @remarks Use it for a debounce, a settle window, or a dwell delay. The timer
 * belongs to the component, so no callback fires after the component unmounts.
 * React runs the cleanup of a parent before the cleanups of its children. Thus
 * a child cleanup can call `set` after the timer cleared. That timer waits for
 * the effect to run again, so it never starts after an unmount. Strict Mode and
 * an `<Activity>` that shows its content again run the effect again, and the
 * timer then starts.
 */
export function useTimeout(): Timeout {
	const [{ scheduler, mount }] = useState(createTimeout)

	useEffect(mount, [mount])

	return scheduler
}

const createTimeout = () =>
	createScheduler(
		(run, ms: number) => setTimeout(run, Math.min(ms, MAX_TIMEOUT)),
		(id) => clearTimeout(id),
	)

/**
 * A restartable task on one platform scheduler, and the effect of its owner.
 * {@link useTimeout} and `useAnimationFrame` share it.
 *
 * @param request - Schedules `run` and gives its id. It gets the arguments of
 * `set` after the callback. It reads the platform function at each call, not at
 * the import, so fake timers that a test installs later apply.
 * @param cancel - Cancels the task that has the id.
 * @returns The task, and the effect that starts a task that waits. The cleanup
 * of that effect cancels the task and makes the next `set` wait.
 */
export function createScheduler<Id, Args extends unknown[]>(
	request: (run: () => void, ...args: Args) => Id,
	cancel: (id: Id) => void,
): {
	scheduler: {
		set: (callback: () => void, ...args: Args) => void
		clear: () => void
		pending: () => boolean
	}
	mount: () => () => void
} {
	let id: Id | null = null

	// The start of a task that `set` called between the effect cleanup and the
	// next run of the effect.
	let waiting: (() => void) | null = null

	// True from the creation to the cleanup, so a call during the first render
	// or in a layout effect starts the task at once.
	let mounted = true

	const clear = () => {
		waiting = null

		if (id === null) return

		cancel(id)

		id = null
	}

	const scheduler = {
		set: (callback: () => void, ...args: Args) => {
			clear()

			const run = () => {
				id = null

				callback()
			}

			const start = () => {
				id = request(run, ...args)
			}

			if (mounted) start()
			else waiting = start
		},
		clear,
		pending: () => id !== null || waiting !== null,
	}

	const mount = () => {
		mounted = true

		const start = waiting

		waiting = null

		start?.()

		return () => {
			mounted = false

			clear()
		}
	}

	return { scheduler, mount }
}
