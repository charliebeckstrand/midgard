'use client'

import { type RefObject, useCallback, useRef } from 'react'
import type { ToastData } from './types'

/**
 * Drives the staggered exit queue for {@link ToastProvider}: `start` snapshots
 * the non-persistent toasts and removes them one at a time, advancing on each
 * `handleExitComplete` so their leave animations don't overlap.
 *
 * @param onRemove - Called with each toast the queue takes out of the list, after the
 * removal. The queue does not name the reason; the provider reads one from the toast.
 * @returns The queue controls (`start`, `stop`, `next`, `handleExitComplete`)
 * plus a `runningRef` flag.
 * @internal
 */
export function useToastQueue(
	toastsRef: RefObject<ToastData[]>,
	sync: () => void,
	onRemove: (toast: ToastData) => void,
) {
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

		const removed = toastsRef.current.find((t) => t.id === id)

		toastsRef.current = toastsRef.current.filter((t) => t.id !== id)
		sync()

		if (removed) onRemove(removed)
	}, [toastsRef, sync, onRemove])

	const start = useCallback(() => {
		runningRef.current = true

		queueRef.current = toastsRef.current.filter((t) => !t.persist).map((t) => t.id)

		next()
	}, [toastsRef, next])

	const handleExitComplete = useCallback(() => {
		if (runningRef.current) next()
	}, [next])

	return { runningRef, start, stop, next, handleExitComplete }
}
