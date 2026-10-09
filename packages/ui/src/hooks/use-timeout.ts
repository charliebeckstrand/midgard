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

/** The frame that {@link useAnimationFrame} gives. Each function keeps its identity. */
export type AnimationFrame = {
	/** Requests the frame. It cancels a pending frame first, so the last call wins. */
	set: (callback: () => void) => void
	/** Cancels a pending frame. It does nothing when no frame is pending. */
	clear: () => void
	/** Whether a frame is requested and has not run or been canceled. */
	pending: () => boolean
}

/**
 * One restartable animation frame that cancels on unmount.
 *
 * @returns An {@link AnimationFrame} that keeps its identity.
 * @remarks Use it to do work one time for each frame, or to do work after the
 * next paint. The frame belongs to the component, so no callback runs after the
 * component unmounts. A callback can call `set` again to poll frame by frame.
 * @internal
 */
export function useAnimationFrame(): AnimationFrame {
	const [frame] = useState(createAnimationFrame)

	useEffect(() => frame.clear, [frame])

	return frame
}

function createAnimationFrame(): AnimationFrame {
	let id: number | null = null

	const clear = () => {
		if (id === null) return

		cancelAnimationFrame(id)

		id = null
	}

	return {
		set: (callback) => {
			clear()

			id = requestAnimationFrame(() => {
				id = null

				callback()
			})
		},
		clear,
		pending: () => id !== null,
	}
}
