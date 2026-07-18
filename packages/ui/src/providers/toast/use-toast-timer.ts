'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'
import type { ToastData } from './types'

/**
 * Owns the auto-dismiss countdown for {@link ToastProvider}: arms a single
 * timer for the remaining duration, pauses it while pointer/focus holds exist
 * (WCAG 2.2.1) and resumes with the leftover time, and exposes reset hooks for
 * re-armed toasts.
 *
 * @returns The timer controls (`startTimer`, `pause`, `resume`,
 * `resetRemaining`, `reset`) plus the `remainingRef` countdown.
 *
 * @remarks
 * The pause is a source count, not a flag: each hold (a toast's hover, a
 * toast's focus) pairs one `pause()` with one `resume()`, and the timer runs
 * only at zero. A boolean can't survive a toast unmounting mid-hold — the
 * releasing `mouseleave`/`blur` never fires for a removed node, and a single
 * flag can't tell which holds remain — so each `ToastAlert` releases its own
 * holds on unmount and the count settles back to running.
 * @internal
 */
export function useToastTimer(
	toastsRef: RefObject<ToastData[]>,
	duration: number,
	start: () => void,
	stop: () => void,
) {
	const remainingRef = useRef(duration)

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	const startRef = useRef(0)

	const pauseCountRef = useRef(0)

	useEffect(() => () => clearTimeout(timerRef.current), [])

	const startTimer = useCallback(() => {
		// Don't arm while any hold remains (pointer/focus on a live toast); the
		// final `resume` restarts. WCAG 2.2.1: no live auto-dismiss timer under
		// the user's pointer/focus.
		if (pauseCountRef.current > 0) return

		clearTimeout(timerRef.current)

		startRef.current = Date.now()

		timerRef.current = setTimeout(start, remainingRef.current)
	}, [start])

	const pause = useCallback(() => {
		pauseCountRef.current += 1

		// Only the first hold freezes the countdown; further holds just deepen it.
		if (pauseCountRef.current > 1) return

		const elapsed = Date.now() - startRef.current

		remainingRef.current = Math.max(remainingRef.current - elapsed, 0)

		clearTimeout(timerRef.current)
		stop()
	}, [stop])

	const resume = useCallback(() => {
		// Floored: an unpaired release must not push the count negative and
		// swallow a later hold.
		pauseCountRef.current = Math.max(pauseCountRef.current - 1, 0)

		if (pauseCountRef.current > 0) return

		if (toastsRef.current.length > 0) startTimer()
	}, [toastsRef, startTimer])

	const resetRemaining = useCallback(
		(ms?: number) => {
			remainingRef.current = ms ?? duration
		},
		[duration],
	)

	// Restores the full duration and restarts the timer. While held, skips the
	// restart; the final `resume()` picks up the new remaining on release.
	const reset = useCallback(
		(ms?: number) => {
			remainingRef.current = ms ?? duration

			if (pauseCountRef.current > 0 || toastsRef.current.length === 0) return

			startTimer()
		},
		[duration, startTimer, toastsRef],
	)

	return { remainingRef, startTimer, pause, resume, resetRemaining, reset }
}
