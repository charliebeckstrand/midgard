'use client'

import { type RefObject, useCallback, useRef } from 'react'
import { useTimeout } from '../../hooks/use-timeout'
import { k } from '../../recipes/kata/toast'
import type { ToastData } from './types'

/**
 * The time (ms) that the queue waits for an exit before it advances without one.
 * It is two dismiss motions, so an exit that runs comes first.
 * @internal
 */
const exitFallback = k.motion.dismiss.duration * 1000 * 2

/**
 * Drives the staggered exit queue for {@link ToastProvider}. `start` adds the toasts whose
 * time is up, and the queue removes them one at a time. It advances on each
 * `handleExitComplete`, so that their leave animations do not overlap. When no exit
 * comes, because the viewport is not mounted or did not have the toast, the queue
 * advances after a fallback time.
 *
 * @param onRemove - Called with each toast the queue takes out of the list, after the
 * removal. The queue does not name the reason; the provider reads one from the toast.
 * @returns The queue controls (`start`, `stop`, `handleExitComplete`) plus a
 * `runningRef` flag.
 * @internal
 */
export function useToastQueue(
	toastsRef: RefObject<ToastData[]>,
	sync: () => void,
	onRemove: (toast: ToastData) => void,
) {
	const queueRef = useRef<string[]>([])

	const runningRef = useRef(false)

	const fallback = useTimeout()

	const stop = useCallback(() => {
		fallback.clear()

		runningRef.current = false

		queueRef.current = []
	}, [fallback])

	const next = useCallback(() => {
		let removed: ToastData | undefined

		// Skips an id that left by another route after it was queued: its removal
		// has no leave animation of its own, so the queue would stall on it.
		while (!removed) {
			const id = queueRef.current.shift()

			if (!id) {
				runningRef.current = false

				return false
			}

			removed = toastsRef.current.find((toast) => toast.id === id)
		}

		const { id } = removed

		toastsRef.current = toastsRef.current.filter((toast) => toast.id !== id)
		sync()

		onRemove(removed)

		return true
	}, [toastsRef, sync, onRemove])

	// The exit callback or the fallback timer advances the queue, whichever comes
	// first. Each advance clears the timer, and arms it again after a removal.
	const advance = useCallback(() => {
		const step = () => {
			fallback.clear()

			if (next()) fallback.set(step, exitFallback)
		}

		step()
	}, [next, fallback])

	// Adds `ids` behind the ids already queued. A running queue takes them on its
	// next advance; an idle queue starts at once.
	const start = useCallback(
		(ids: string[]) => {
			for (const id of ids) {
				if (!queueRef.current.includes(id)) queueRef.current.push(id)
			}

			if (runningRef.current) return

			runningRef.current = true

			advance()
		},
		[advance],
	)

	const handleExitComplete = useCallback(() => {
		if (runningRef.current) advance()
	}, [advance])

	return { runningRef, start, stop, handleExitComplete }
}
