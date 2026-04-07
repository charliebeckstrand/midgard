import { useCallback, useRef } from 'react'
import type { ToastData } from './toast-context'

export function useTimer(
	toastsRef: React.RefObject<ToastData[]>,
	duration: number,
	startDrain: () => void,
	stopDrain: () => void,
) {
	const remainingRef = useRef(duration)
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
	const startRef = useRef(0)

	const startTimer = useCallback(() => {
		clearTimeout(timerRef.current)

		startRef.current = Date.now()

		timerRef.current = setTimeout(startDrain, remainingRef.current)
	}, [startDrain])

	const pause = useCallback(() => {
		const elapsed = Date.now() - startRef.current

		remainingRef.current = Math.max(remainingRef.current - elapsed, 0)

		clearTimeout(timerRef.current)
		stopDrain()
	}, [stopDrain])

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
