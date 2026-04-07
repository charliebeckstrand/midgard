import { useCallback, useRef } from 'react'
import type { ToastData } from './toast-context'

export function useDrain(toastsRef: React.RefObject<ToastData[]>, sync: () => void) {
	const drainQueueRef = useRef<string[]>([])
	const drainingRef = useRef(false)

	const stopDrain = useCallback(() => {
		drainingRef.current = false

		drainQueueRef.current = []
	}, [])

	const drainNext = useCallback(() => {
		const id = drainQueueRef.current.shift()

		if (!id) {
			drainingRef.current = false

			return
		}

		toastsRef.current = toastsRef.current.filter((t) => t.id !== id)
		sync()
	}, [toastsRef, sync])

	const startDrain = useCallback(() => {
		drainingRef.current = true

		const active = toastsRef.current.filter((t) => !t.overflow)

		drainQueueRef.current = active.map((t) => t.id)

		drainNext()
	}, [toastsRef, drainNext])

	const handleExitComplete = useCallback(() => {
		if (drainingRef.current) drainNext()
	}, [drainNext])

	return { drainingRef, stopDrain, drainNext, startDrain, handleExitComplete }
}
