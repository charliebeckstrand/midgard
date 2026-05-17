'use client'

import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import {
	type ToastContextValue,
	ToastValueProvider,
	type ToastViewportContextValue,
	ToastViewportProvider,
} from './context'
import type { ToastData, ToastInput } from './types'
import { useToastDrain } from './use-toast-drain'
import { useToastTimer } from './use-toast-timer'

export type ToastProviderProps = {
	children: ReactNode
	/** Default lifetime (ms) for toasts that don't set `persist` or their own `duration`. */
	duration?: number
	/** Cap on active toasts; oldest are dismissed when exceeded. */
	maxToasts?: number
}

let counter = 0

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

	const { stopDrain, startDrain, handleExitComplete } = useToastDrain(toastsRef, sync)

	const { startTimer, pause, resume, resetRemaining } = useToastTimer(
		toastsRef,
		duration,
		startDrain,
		stopDrain,
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

					if (toastsRef.current.length === 0) stopDrain()
				})

				return
			}

			toastsRef.current = toastsRef.current.filter((t) => t.id !== id)

			sync()

			if (toastsRef.current.length === 0) stopDrain()
		},
		[sync, stopDrain],
	)

	const toast = useCallback(
		(data: ToastInput) => {
			stopDrain()

			const id = `toast-${++counter}`

			toastsRef.current = [...toastsRef.current, { ...data, id, zIndex: counter }]

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
		[maxToasts, duration, sync, startTimer, stopDrain, resetRemaining, dismiss],
	)

	const publicValue = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss])

	// Viewport value changes every render (toasts array is recomputed) — only
	// the viewport consumes it, so re-rendering with each push is intentional.
	const viewportValue: ToastViewportContextValue = {
		toasts: [...toastsRef.current].reverse(),
		dismiss,
		pause,
		resume,
		handleExitComplete,
	}

	return (
		<ToastValueProvider value={publicValue}>
			<ToastViewportProvider value={viewportValue}>{children}</ToastViewportProvider>
		</ToastValueProvider>
	)
}
