'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'
import type { ToastData } from './types'

export function useToastTimer(
	toastsRef: RefObject<ToastData[]>,
	duration: number,
	start: () => void,
	stop: () => void,
) {
	const remainingRef = useRef(duration)

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	const startRef = useRef(0)

	const pausedRef = useRef(false)

	useEffect(() => () => clearTimeout(timerRef.current), [])

	const startTimer = useCallback(() => {
		// Don't arm while paused (pointer/focus on a live toast); `resume` clears
		// the flag before restarting. WCAG 2.2.1: no live auto-dismiss timer under
		// the user's pointer/focus.
		if (pausedRef.current) return

		clearTimeout(timerRef.current)

		startRef.current = Date.now()

		timerRef.current = setTimeout(start, remainingRef.current)
	}, [start])

	const pause = useCallback(() => {
		// Hover and focus both pause (onMouseEnter + onFocus); the guard makes
		// the second call a no-op.
		if (pausedRef.current) return

		pausedRef.current = true

		const elapsed = Date.now() - startRef.current

		remainingRef.current = Math.max(remainingRef.current - elapsed, 0)

		clearTimeout(timerRef.current)
		stop()
	}, [stop])

	const resume = useCallback(() => {
		pausedRef.current = false

		if (toastsRef.current.length > 0) startTimer()
	}, [toastsRef, startTimer])

	const resetRemaining = useCallback(
		(ms?: number) => {
			remainingRef.current = ms ?? duration
		},
		[duration],
	)

	// Restores the full duration and restarts the timer. While paused, skips
	// the restart; `resume()` picks up the new remaining when the pointer leaves.
	const reset = useCallback(
		(ms?: number) => {
			remainingRef.current = ms ?? duration

			if (pausedRef.current || toastsRef.current.length === 0) return

			startTimer()
		},
		[duration, startTimer, toastsRef],
	)

	return { remainingRef, startTimer, pause, resume, resetRemaining, reset }
}
