'use client'

import { useEffect, useState } from 'react'

/** The timer that {@link useTimeout} gives. Each function keeps its identity. */
export type Timeout = {
	/** Starts the timer. It clears a pending timer first, so the last call wins. */
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

			id = setTimeout(() => {
				id = null

				callback()
			}, ms)
		},
		clear,
		pending: () => id !== null,
	}
}
