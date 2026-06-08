'use client'

import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import {
	ToastContext,
	type ToastContextValue,
	ToastViewportContext,
	type ToastViewportContextValue,
} from './context'
import type { ToastData, ToastInput } from './types'
import { useToastQueue } from './use-toast-queue'
import { useToastTimer } from './use-toast-timer'

type ToastProviderProps = {
	children: ReactNode
	/** Default lifetime (ms) for toasts that don't set `persist` or their own `duration`. */
	duration?: number
	/** Cap on active toasts; oldest are dismissed when exceeded. */
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

	const { start, stop, handleExitComplete } = useToastQueue(toastsRef, sync)

	const { startTimer, pause, resume, resetRemaining, reset } = useToastTimer(
		toastsRef,
		duration,
		start,
		stop,
	)

	const dismiss = useCallback(
		(id: string) => {
			const toast = toastsRef.current.find((t) => t.id === id)

			if (!toast) return

			if (!toast.dismissed) {
				toastsRef.current = toastsRef.current.map((t) =>
					t.id === id ? { ...t, dismissed: true } : t,
				)

				sync()

				requestAnimationFrame(() => {
					toastsRef.current = toastsRef.current.filter((t) => t.id !== id)

					sync()

					if (toastsRef.current.length === 0) stop()
				})

				return
			}

			toastsRef.current = toastsRef.current.filter((t) => t.id !== id)

			sync()

			if (toastsRef.current.length === 0) stop()
		},
		[sync, stop],
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
						dismiss(t.id)
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

	const publicValue = useMemo<ToastContextValue>(
		() => ({ toast, dismiss: ({ id }) => dismiss(id) }),
		[toast, dismiss],
	)

	// Viewport value recomputes every render (toasts array) — only the viewport
	// consumes it, and re-rendering on each push is the intended behavior.
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
