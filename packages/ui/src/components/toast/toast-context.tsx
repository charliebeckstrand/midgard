'use client'

import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { createContext } from '../../core'
import { useDrain } from './use-drain'
import { useTimer } from './use-timer'

export type ToastType = 'default' | 'success' | 'warning' | 'error'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export type ToastData = {
	id: string
	title: string
	description?: string
	type?: ToastType
	actions?: React.ReactNode
	showCloseButton?: boolean
	overflow?: boolean
	dismissed?: boolean
}

type ToastInput = Omit<ToastData, 'id' | 'overflow'> & { duration?: number }

type ToastContextValue = {
	toast: (data: ToastInput) => string
	dismiss: (id: string) => void
}

const [ToastContext, useToast] = createContext<ToastContextValue>('Toast')

export { ToastContext, useToast }

export type ToastContextProps = {
	children: React.ReactNode
	position?: ToastPosition
	duration: number
	maxToasts?: number
	closeIcon?: React.ReactNode
}

let counter = 0

export function useToastState({
	position,
	duration,
	maxToasts = 5,
}: {
	position: ToastPosition
	duration: number
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

				// Remove on next frame so AnimatePresence captures the dismissed exit
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

			toastsRef.current = [...toastsRef.current, { ...data, id }]

			// Mark oldest toasts as overflow when exceeding max
			const active = toastsRef.current.filter((t) => !t.overflow)

			const excess = maxToasts > 0 ? active.length - maxToasts : 0

			if (excess > 0) {
				let marked = 0

				toastsRef.current = toastsRef.current.map((t) => {
					if (!t.overflow && marked < excess) {
						marked++

						return { ...t, overflow: true }
					}

					return t
				})
			}

			resetRemaining(data.duration ?? duration)

			startTimer()

			sync()

			return id
		},
		[maxToasts, duration, sync, startTimer, stopDrain, resetRemaining],
	)

	const toasts = [...toastsRef.current].reverse()

	return { toasts, toast, dismiss, pause, resume, handleExitComplete, isBottom }
}
