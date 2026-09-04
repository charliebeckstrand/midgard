'use client'

import { type ReactNode, useCallback, useMemo, useReducer, useRef } from 'react'
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
 * App-root toast state. Manages the toast queue, timers, and pause/resume
 * behaviour, and exposes `useToast()` to any descendant. Render a `<Toast>`
 * viewport (from `ui/toast`) anywhere inside the provider to display the
 * queued toasts.
 */
export function ToastProvider({ children, duration = 5000, maxToasts = 5 }: ToastProviderProps) {
	const toastsRef = useRef<ToastData[]>([])

	const [, sync] = useReducer((n: number) => n + 1, 0)

	/*
	 * `dismissed` is the latch. It is written once, in `dismiss` below, at the moment a
	 * toast starts leaving, and it rides the toast rather than a parallel register — so
	 * the second `dismiss` of a departure, and the queue removing a toast that `dismiss`
	 * already marked, both find it set and stay quiet.
	 */
	const handleRemove = useCallback((toast: ToastData) => {
		// The queue is the timeout exit; the other three routes report from `dismiss`.
		if (!toast.dismissed) toast.onDismiss?.('timeout')
	}, [])

	const { start, stop, handleExitComplete } = useToastQueue(toastsRef, sync, handleRemove)

	const { startTimer, pause, resume, resetRemaining, reset } = useToastTimer(
		toastsRef,
		duration,
		start,
		stop,
	)

	const dismiss = useCallback(
		(id: string, reason: ToastDismissReason = 'dismissed') => {
			const toast = toastsRef.current.find((t) => t.id === id)

			if (!toast) return

			const remove = () => {
				toastsRef.current = toastsRef.current.filter((t) => t.id !== id)

				sync()

				if (toastsRef.current.length === 0) stop()
			}

			if (toast.dismissed) return remove()

			toastsRef.current = toastsRef.current.map((t) =>
				t.id === id ? { ...t, dismissed: true } : t,
			)

			sync()

			// After the mark, so a consumer that dismisses from inside its own handler
			// re-finds a marked toast and takes the removal branch instead of reporting
			// a second time.
			toast.onDismiss?.(reason)

			requestAnimationFrame(remove)
		},
		[stop],
	)

	const toast = useCallback(
		(data: ToastInput) => {
			stop()

			const id = data.id ?? crypto.randomUUID()

			toastsRef.current = [
				...toastsRef.current,
				{ ...data, id, duration: data.duration ?? duration },
			]

			if (maxToasts > 0) {
				const active = toastsRef.current.filter((t) => !t.dismissed)

				for (const t of active.slice(0, Math.max(0, active.length - maxToasts))) {
					dismiss(t.id, 'evicted')
				}
			}

			resetRemaining(data.duration ?? duration)

			if (!data.persist) startTimer()

			sync()

			return id
		},
		[maxToasts, duration, startTimer, stop, resetRemaining, dismiss],
	)

	const resetToast = useCallback(
		(id: string) => {
			const target = toastsRef.current.find((t) => t.id === id)

			if (!target || target.dismissed || target.persist) return

			reset(target.duration)
		},
		[reset],
	)

	const publicValue = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss])

	// Viewport value recomputes every render (toasts array); only the viewport
	// consumes it and re-renders on each push.
	const viewportValue: ToastViewportContextValue = {
		toasts: toastsRef.current.toReversed(),
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
