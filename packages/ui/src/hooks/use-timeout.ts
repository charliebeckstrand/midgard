'use client'

import { useEffect, useState } from 'react'
import { MAX_TIMEOUT } from '../utilities/time-units'

/** The timer that {@link useTimeout} gives. Each function keeps its identity. */
export type Timeout = {
	/**
	 * Starts the timer. It clears a pending timer first, so the last call wins. A
	 * delay longer than the platform timer holds, such as `Infinity`, fires at
	 * that limit, not at once.
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
 */
export function useTimeout(): Timeout {
	const [timeout] = useState(createTimeout)

	useEffect(() => timeout.clear, [timeout])

	return timeout
}

function createTimeout(): Timeout {
	let id: ReturnType<typeof setTimeout> | null = null

	const clear = () => {
		if (id === null) return

		clearTimeout(id)

		id = null
	}

	return {
		set: (callback, ms) => {
			clear()

			const fire = () => {
				id = null

				callback()
			}

			id = setTimeout(fire, Math.min(ms, MAX_TIMEOUT))
		},
		clear,
		pending: () => id !== null,
	}
}
