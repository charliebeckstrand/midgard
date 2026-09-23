'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'
import type { ToastData } from './types'

/**
 * Owns the auto-dismiss countdowns for {@link ToastProvider}. Each toast counts down its own
 * `duration`. One timer is armed to the earliest live deadline, and it pauses while pointer or
 * focus holds exist (WCAG 2.2.1).
 *
 * @param start - Called with the ids whose time is up, oldest first. The staggered queue
 * removes them one at a time.
 * @param stop - Called on the first hold, so that the staggered queue stops too.
 * @returns The timer controls: `arm`, `pause` and `resume`.
 *
 * @remarks
 * The pause is a source count, not a flag. Each hold (a toast's hover, a
 * toast's focus) pairs one `pause()` with one `resume()`, and the timer runs
 * only at zero. A boolean can't survive a toast unmounting mid-hold. The
 * releasing `mouseleave`/`blur` never fires for a removed node, and a single
 * flag can't tell which holds remain. Each `ToastAlert` therefore releases its
 * own holds on unmount, and the count settles back to running.
 *
 * One pause covers the whole stack. A hold on any toast stops every countdown.
 * @internal
 */
export function useToastTimer(
	toastsRef: RefObject<ToastData[]>,
	start: (ids: string[]) => void,
	stop: () => void,
) {
	// The time left for each counted toast, measured at `sinceRef`.
	const remainingRef = useRef(new Map<string, number>())

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	const sinceRef = useRef(0)

	const pauseCountRef = useRef(0)

	useEffect(() => () => clearTimeout(timerRef.current), [])

	// Recorded, not guarded: on whole-provider unmount, parent-first cleanup order
	// can re-arm a timer nothing then clears. It fires `start` into detached refs
	// and a no-op state update — a leaked callback during teardown with no crash
	// and no user-visible effect, so a disposed flag would buy nothing.

	// Moves each countdown to now, and drops the toasts that are gone or leave by
	// another route. While held, the clock is stopped, so no time is subtracted.
	const settle = useCallback(() => {
		const now = Date.now()

		const elapsed = pauseCountRef.current > 0 ? 0 : now - sinceRef.current

		sinceRef.current = now

		const live = new Set(toastsRef.current.filter((t) => !t.dismissed).map((t) => t.id))

		for (const [id, left] of remainingRef.current) {
			if (live.has(id)) remainingRef.current.set(id, Math.max(left - elapsed, 0))
			else remainingRef.current.delete(id)
		}
	}, [toastsRef])

	// Arms the one timer to the earliest live deadline. Call it after `settle`.
	const schedule = useCallback(() => {
		clearTimeout(timerRef.current)

		// WCAG 2.2.1: no live auto-dismiss timer under the user's pointer or focus.
		// The final `resume` arms again.
		if (pauseCountRef.current > 0 || remainingRef.current.size === 0) return

		const next = Math.min(...remainingRef.current.values())

		timerRef.current = setTimeout(() => {
			settle()

			const expired = toastsRef.current
				.map((t) => t.id)
				.filter((id) => remainingRef.current.get(id) === 0)

			for (const id of expired) remainingRef.current.delete(id)

			if (expired.length > 0) start(expired)

			schedule()
		}, next)
	}, [settle, start, toastsRef])

	// Sets the countdown of one toast to `ms` from now, for a new toast or a reset.
	// While held, the countdown stays frozen until the final `resume`.
	const arm = useCallback(
		(id: string, ms: number) => {
			settle()

			remainingRef.current.set(id, ms)

			schedule()
		},
		[settle, schedule],
	)

	const pause = useCallback(() => {
		// Only the first hold freezes the countdowns; further holds just deepen it.
		if (pauseCountRef.current > 0) {
			pauseCountRef.current += 1

			return
		}

		settle()

		pauseCountRef.current = 1

		// `stop` empties the staggered queue. A live toast with no countdown is in
		// that queue, with its time up, so it counts again from zero.
		for (const t of toastsRef.current) {
			if (!(t.persist || t.dismissed || remainingRef.current.has(t.id))) {
				remainingRef.current.set(t.id, 0)
			}
		}

		clearTimeout(timerRef.current)
		stop()
	}, [settle, stop, toastsRef])

	const resume = useCallback(() => {
		// Before the count drops, so that the held time is not subtracted.
		settle()

		// Floored: an unpaired release must not push the count negative and
		// swallow a later hold.
		pauseCountRef.current = Math.max(pauseCountRef.current - 1, 0)

		if (pauseCountRef.current > 0) return

		schedule()
	}, [settle, schedule])

	return { arm, pause, resume }
}
