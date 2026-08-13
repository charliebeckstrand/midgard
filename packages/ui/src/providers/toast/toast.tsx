'use client'

import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
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

	const [, flush] = useState(0)

	const sync = useCallback(() => flush((n) => n + 1), [])

	/*
	 * One report per toast. A toast leaves by four routes and two seams — the queue's
	 * timeout and `dismiss`'s other three — and `dismiss` runs twice for one departure
	 * (mark, then remove a frame later). The set is the latch that keeps those from
	 * doubling up; ids leave it with the toast they name.
	 */
	const reportedRef = useRef<Set<string>>(new Set())

	const notifyDismiss = useCallback((toast: ToastData, reason: ToastDismissReason) => {
		if (reportedRef.current.has(toast.id)) return

		reportedRef.current.add(toast.id)

		toast.onDismiss?.(reason)
	}, [])

	const handleTimeout = useCallback(
		(toast: ToastData) => {
			notifyDismiss(toast, 'timeout')

			// The queue removed it before calling, so no second report can find it.
			reportedRef.current.delete(toast.id)
		},
		[notifyDismiss],
	)

	const { start, stop, handleExitComplete } = useToastQueue(toastsRef, sync, handleTimeout)

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

			notifyDismiss(toast, reason)

			if (!toast.dismissed) {
				toastsRef.current = toastsRef.current.map((t) =>
					t.id === id ? { ...t, dismissed: true } : t,
				)

				sync()

				requestAnimationFrame(() => {
					toastsRef.current = toastsRef.current.filter((t) => t.id !== id)

					reportedRef.current.delete(id)

					sync()

					if (toastsRef.current.length === 0) stop()
				})

				return
			}

			toastsRef.current = toastsRef.current.filter((t) => t.id !== id)

			reportedRef.current.delete(id)

			sync()

			if (toastsRef.current.length === 0) stop()
		},
		[sync, stop, notifyDismiss],
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

				const excess = active.length - maxToasts

				if (excess > 0) {
					const toDismiss = active.slice(0, excess)

					for (const t of toDismiss) {
						dismiss(t.id, 'evicted')
					}
				}
			}

			resetRemaining(data.duration ?? duration)

			if (!data.persist) startTimer()

			sync()

			return id
		},
		[maxToasts, duration, sync, startTimer, stop, resetRemaining, dismiss],
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
		toasts: [...toastsRef.current].reverse(),
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
