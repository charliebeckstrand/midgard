'use client'

import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { randomId } from '../../utilities/random-id'
import {
	ToastContext,
	type ToastContextValue,
	ToastViewportContext,
	type ToastViewportContextValue,
} from './context'
import type { ToastData, ToastDismissReason, ToastInput } from './types'
import { useToastQueue } from './use-toast-queue'
import { useToastTimer } from './use-toast-timer'

/** Props for {@link ToastProvider}: the default `duration` and `maxToasts` cap, plus `children`. */
export type ToastProviderProps = {
	children: ReactNode
	/**
	 * Default lifetime (ms) for toasts that don't set `persist` or their own `duration`.
	 *
	 * @defaultValue 5000
	 */
	duration?: number
	/**
	 * Cap on active toasts; oldest are dismissed when exceeded.
	 *
	 * @defaultValue 5
	 */
	maxToasts?: number
}

/**
 * Toast state. Manages the toast queue, timers, and pause/resume
 * behavior, and exposes `useToast()` to any descendant. Render a `<Toast>`
 * viewport (from `ui/toast`) anywhere inside the provider to display the
 * queued toasts.
 *
 * `UIProvider` already mounts one, with its viewport, for the whole app. Use
 * this provider for a queue of its own, such as one with a different
 * `maxToasts` in one part of the page.
 *
 * @remarks
 * Each toast counts down its own `duration`, and leaves with `'timeout'` when its own time is
 * up. A new toast does not change the time left on the others. A hover or focus on any toast
 * pauses all the countdowns (WCAG 2.2.1).
 *
 * A `toast()` call with the `id` of a live toast replaces that toast in place, and its
 * countdown starts again. A repeated toast thus shows once, and a loading toast can turn
 * into its result.
 */
export function ToastProvider({ children, duration = 5000, maxToasts = 5 }: ToastProviderProps) {
	// The callbacks read and write the list in the ref, because one call can read
	// its own write before the next render. `sync` publishes the list to state,
	// and render reads only that state.
	const toastsRef = useRef<ToastData[]>([])

	const [toasts, setToasts] = useState<ToastData[]>([])

	const sync = useCallback(() => setToasts(toastsRef.current), [])

	/*
	 * `dismissed` is the latch. It is written once, in `dismiss` below, at the moment a
	 * toast starts leaving, and it rides the toast rather than a parallel register.
	 * The second `dismiss` of a departure, and the queue removing a toast that
	 * `dismiss` already marked, both find it set and stay quiet.
	 */
	const handleRemove = useCallback((toast: ToastData) => {
		// The queue is the timeout exit; the other three routes report from `dismiss`.
		if (!toast.dismissed) toast.onDismiss?.('timeout')
	}, [])

	const { start, stop, unqueue, handleExitComplete } = useToastQueue(toastsRef, sync, handleRemove)

	const { arm, disarm, pause, resume } = useToastTimer(toastsRef, start, stop)

	const dismiss = useCallback(
		(id: string, reason: ToastDismissReason = 'dismissed') => {
			const toast = toastsRef.current.find((item) => item.id === id)

			if (!toast) return

			// Only the leaving entry goes. A later call can give its id to a new toast
			// before this frame, and that toast stays.
			const remove = () => {
				toastsRef.current = toastsRef.current.filter((item) => !(item.id === id && item.dismissed))

				sync()

				if (toastsRef.current.length === 0) stop()
			}

			if (toast.dismissed) return remove()

			toastsRef.current = toastsRef.current.map((item) =>
				item.id === id ? { ...item, dismissed: true } : item,
			)

			sync()

			// After the mark, so a consumer that dismisses from inside its own handler
			// re-finds a marked toast and takes the removal branch instead of reporting
			// a second time.
			toast.onDismiss?.(reason)

			requestAnimationFrame(remove)
		},
		[stop, sync],
	)

	const toast = useCallback(
		(data: ToastInput) => {
			const id = data.id ?? randomId()

			const next: ToastData = { ...data, id, duration: data.duration ?? duration }

			const live = toastsRef.current.some((item) => item.id === id && !item.dismissed)

			if (live) {
				// A call with the id of a live toast replaces that toast in place, so the
				// toast keeps its place and its key. Its countdown starts again.
				toastsRef.current = toastsRef.current.map((item) => (item.id === id ? next : item))

				unqueue(id)

				if (data.persist) disarm(id)
				else arm(id, next.duration)

				sync()

				return id
			}

			// A toast that leaves under the same id has reported its exit. The new toast
			// takes its place at once, so two entries never share a key.
			toastsRef.current = [...toastsRef.current.filter((item) => item.id !== id), next]

			if (maxToasts > 0) {
				const active = toastsRef.current.filter((item) => !item.dismissed)

				for (const evicted of active.slice(0, Math.max(0, active.length - maxToasts))) {
					dismiss(evicted.id, 'evicted')
				}
			}

			if (!data.persist) arm(id, data.duration ?? duration)

			sync()

			return id
		},
		[maxToasts, duration, arm, disarm, dismiss, sync, unqueue],
	)

	const resetToast = useCallback(
		(id: string) => {
			const target = toastsRef.current.find((item) => item.id === id)

			if (!target || target.dismissed || target.persist) return

			arm(id, target.duration)
		},
		[arm],
	)

	// A closure of its own, with one parameter. A caller that passes `dismiss` by reference,
	// as in `ids.forEach(dismiss)`, cannot put a second argument into the reason.
	const publicValue = useMemo<ToastContextValue>(
		() => ({ toast, dismiss: (id: string) => dismiss(id) }),
		[toast, dismiss],
	)

	// Viewport value recomputes every render (toasts array); only the viewport
	// consumes it and re-renders on each push.
	const viewportValue: ToastViewportContextValue = {
		toasts: toasts.toReversed(),
		dismiss,
		pause,
		resume,
		reset: resetToast,
		handleExitComplete,
	}

	return (
		<ToastContext value={publicValue}>
			<ToastViewportContext value={viewportValue}>{children}</ToastViewportContext>
		</ToastContext>
	)
}
