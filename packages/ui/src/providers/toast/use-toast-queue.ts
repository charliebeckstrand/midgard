'use client'

import { type RefObject, useCallback, useRef } from 'react'
import type { ToastData } from './types'

/**
 * Drives the staggered exit queue for {@link ToastProvider}: `start` snapshots
 * the non-persistent toasts and removes them one at a time, advancing on each
 * `handleExitComplete` so their leave animations don't overlap.
 *
 * @param onTimeout - Called with each toast the queue removes, i.e. the ones whose
 * lifetime ran out. The other three exits run through the provider's `dismiss`.
 * @returns The queue controls (`start`, `stop`, `next`, `handleExitComplete`)
 * plus a `runningRef` flag.
 * @internal
 */
export function useToastQueue(
	toastsRef: RefObject<ToastData[]>,
	sync: () => void,
	onTimeout: (toast: ToastData) => void,
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

		// The queue is the timeout exit: `dismiss` handles the other three, so a toast
		// removed here has run its lifetime out.
		const expired = toastsRef.current.find((t) => t.id === id)

		toastsRef.current = toastsRef.current.filter((t) => t.id !== id)
		sync()

		if (expired) onTimeout(expired)
	}, [toastsRef, sync, onTimeout])

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
