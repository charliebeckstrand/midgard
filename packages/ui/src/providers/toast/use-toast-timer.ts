import { type RefObject, useCallback, useRef } from 'react'
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

	const startTimer = useCallback(() => {
		clearTimeout(timerRef.current)

		startRef.current = Date.now()

		timerRef.current = setTimeout(start, remainingRef.current)
	}, [start])

	const pause = useCallback(() => {
		const elapsed = Date.now() - startRef.current

		remainingRef.current = Math.max(remainingRef.current - elapsed, 0)

		clearTimeout(timerRef.current)
		stop()
	}, [stop])

	const resume = useCallback(() => {
		if (toastsRef.current.length > 0) startTimer()
	}, [toastsRef, startTimer])

	const resetRemaining = useCallback(
		(ms?: number) => {
			remainingRef.current = ms ?? duration
		},
		[duration],
	)

	return { remainingRef, startTimer, pause, resume, resetRemaining }
}
