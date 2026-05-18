import { type MutableRefObject, useCallback, useRef } from 'react'
import type { ToastData } from './types'

export function useToastQueue(toastsRef: MutableRefObject<ToastData[]>, sync: () => void) {
	const queueRef = useRef<string[]>([])
	const runningRef = useRef(false)

	const stop = useCallback(() => {
		runningRef.current = false

		queueRef.current = []
	}, [])

	const next = useCallback(() => {
		const id = queueRef.current.shift()

		if (!id) {
			runningRef.current = false

			return
		}

		toastsRef.current = toastsRef.current.filter((t) => t.id !== id)
		sync()
	}, [toastsRef, sync])

	const start = useCallback(() => {
		runningRef.current = true

		const active = toastsRef.current.filter((t) => !t.persist)

		queueRef.current = active.map((t) => t.id)

		next()
	}, [toastsRef, next])

	const handleExitComplete = useCallback(() => {
		if (runningRef.current) next()
	}, [next])

	return { runningRef, start, stop, next, handleExitComplete }
}
