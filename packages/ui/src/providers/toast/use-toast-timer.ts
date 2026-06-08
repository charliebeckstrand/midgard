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
		clearTimeout(timerRef.current)

		startRef.current = Date.now()

		timerRef.current = setTimeout(start, remainingRef.current)
	}, [start])

	const pause = useCallback(() => {
		// Hover and focus both pause (onMouseEnter + onFocus). Without this guard a
		// second pause subtracts elapsed-since-start again, collapsing the
		// remaining time to ~0 and auto-dismissing the toast mid-interaction.
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

	// Restore the full duration and restart the timer — unless the viewport
	// is paused (mouse still hovered), in which case `resume()` will pick up
	// the new remaining when the user moves away.
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
