'use client'

import { type RefObject, useCallback, useRef } from 'react'
import type { ToastData } from './types'

/**
 * Drives the staggered exit queue for {@link ToastProvider}. `start` adds the toasts whose
 * time is up, and the queue removes them one at a time. It advances on each
 * `handleExitComplete`, so that their leave animations do not overlap.
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
		let removed: ToastData | undefined

		// Skips an id that left by another route after it was queued: its removal
		// has no leave animation of its own, so the queue would stall on it.
		while (!removed) {
			const id = queueRef.current.shift()

			if (!id) {
				runningRef.current = false

				return
			}

			removed = toastsRef.current.find((t) => t.id === id)
		}

		const { id } = removed

		toastsRef.current = toastsRef.current.filter((t) => t.id !== id)
		sync()

		onRemove(removed)
	}, [toastsRef, sync, onRemove])

	// Adds `ids` behind the ids already queued. A running queue takes them on its
	// next advance; an idle queue starts at once.
	const start = useCallback(
		(ids: string[]) => {
			for (const id of ids) {
				if (!queueRef.current.includes(id)) queueRef.current.push(id)
			}

			if (runningRef.current) return

			runningRef.current = true

			next()
		},
		[next],
	)

	const handleExitComplete = useCallback(() => {
		if (runningRef.current) next()
	}, [next])

	return { runningRef, start, stop, next, handleExitComplete }
}
