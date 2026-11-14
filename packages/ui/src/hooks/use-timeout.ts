'use client'

import { useEffect, useState } from 'react'
import { MAX_TIMEOUT } from '../utilities/time-units'

/** The timer that {@link useTimeout} gives. Each function keeps its identity. */
export type Timeout = {
	/**
	 * Starts the timer. It clears a pending timer first, so the last call wins. A
	 * delay longer than the platform timer holds, such as `Infinity`, fires at
	 * that limit, not at once. A call after the component unmounts does nothing.
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
 * a child cleanup can call `set` after the timer cleared, and that call does
 * nothing.
 */
export function useTimeout(): Timeout {
	const [{ timeout, mount }] = useState(createTimeout)

	useEffect(mount, [mount])

	return timeout
}

/**
 * A {@link Timeout} and the effect of its owner. The effect lets `set` start the
 * timer, and its cleanup clears the timer and stops `set`.
 */
function createTimeout(): { timeout: Timeout; mount: () => () => void } {
	let id: ReturnType<typeof setTimeout> | null = null

	// True from the creation to the cleanup, so a call during the first render
	// or in a layout effect starts the timer. An `<Activity>` that hides the
	// component runs the cleanup too, and `set` does nothing until the content
	// shows again and the effect runs again (also in Strict Mode).
	let mounted = true

	const clear = () => {
		if (id === null) return

		clearTimeout(id)

		id = null
	}

	const timeout: Timeout = {
		set: (callback, ms) => {
			clear()

			if (!mounted) return

			const fire = () => {
				id = null

				callback()
			}

			id = setTimeout(fire, Math.min(ms, MAX_TIMEOUT))
		},
		clear,
		pending: () => id !== null,
	}

	const mount = () => {
		mounted = true

		return () => {
			mounted = false

			clear()
		}
	}

	return { timeout, mount }
}
