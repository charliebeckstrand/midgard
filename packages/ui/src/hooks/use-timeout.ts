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
	const [{ timeout, mount }] = useState(createTimeout)

	useEffect(mount, [mount])

	return timeout
}

/**
 * A {@link Timeout} and the effect of its owner. The effect starts a timer that
 * waits, and its cleanup clears the timer and makes the next `set` wait.
 */
function createTimeout(): { timeout: Timeout; mount: () => () => void } {
	let id: ReturnType<typeof setTimeout> | null = null

	// The start of a timer that `set` called between the effect cleanup and the
	// next run of the effect.
	let waiting: (() => void) | null = null

	// True from the creation to the cleanup, so a call during the first render
	// or in a layout effect starts the timer at once.
	let mounted = true

	const clear = () => {
		waiting = null

		if (id === null) return

		clearTimeout(id)

		id = null
	}

	const timeout: Timeout = {
		set: (callback, ms) => {
			clear()

			const start = () => {
				id = setTimeout(
					() => {
						id = null

						callback()
					},
					Math.min(ms, MAX_TIMEOUT),
				)
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

	return { timeout, mount }
}
