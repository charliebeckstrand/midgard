'use client'

import { type ReactNode, useCallback, useRef, useState } from 'react'
import { createContext } from '../../core'
import { useDrain } from './use-drain'
import { useTimer } from './use-timer'

export type ToastType = 'default' | 'secondary' | 'success' | 'warning' | 'error'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export type ToastData = {
	id: string
	zIndex: number
	title: string
	description?: string
	type?: ToastType
	actions?: ReactNode
	showCloseButton?: boolean
	persist?: boolean
	dismissed?: boolean
}

type ToastInput = Omit<ToastData, 'id' | 'zIndex'> & { duration?: number }

type ToastContextValue = {
	toast: (data: ToastInput) => string
	dismiss: (id: string) => void
}

const [ToastContext, useToast] = createContext<ToastContextValue>('Toast')

export { ToastContext, useToast }

export type ToastProps = {
	children: ReactNode
	position?: ToastPosition
	duration?: number
	maxToasts?: number
}

let counter = 0

export function useToastState({
	position,
	duration = 5000,
	maxToasts = 5,
}: {
	position: ToastPosition
	duration?: number
	maxToasts?: number
}) {
	const isBottom = position.startsWith('bottom')

	const toastsRef = useRef<ToastData[]>([])

	const [, flush] = useState(0)

	const sync = useCallback(() => flush((n) => n + 1), [])

	const { stopDrain, startDrain, handleExitComplete } = useDrain(toastsRef, sync)

	const { startTimer, pause, resume, resetRemaining } = useTimer(
		toastsRef,
		duration,
		startDrain,
		stopDrain,
	)

	const dismiss = useCallback(
		(id: string) => {
			const toast = toastsRef.current.find((t) => t.id === id)

			if (!toast) return

			// Mark dismissed so the exit animation uses fade-only
			if (!toast.dismissed) {
				toastsRef.current = toastsRef.current.map((t) =>
					t.id === id ? { ...t, dismissed: true } : t,
				)

				sync()

				// Remove next frame so AnimatePresence captures the exit.
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

			// Dismiss oldest toasts when exceeding max
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

	const toasts = [...toastsRef.current].reverse()

	return { toasts, toast, dismiss, pause, resume, handleExitComplete, isBottom }
}
