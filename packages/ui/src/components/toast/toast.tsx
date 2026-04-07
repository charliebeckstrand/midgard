'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn, createContext } from '../../core'
import { ToastCard } from './toast-card'
import { type ToastViewportVariants, toastViewportVariants } from './variants'

export type ToastType = 'default' | 'success' | 'warning' | 'error'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export type ToastData = {
	id: string
	title: string
	description?: string
	type?: ToastType
	duration?: number
	action?: { label: string; onClick: () => void }
}

type ToastContextValue = {
	toast: (data: Omit<ToastData, 'id'>) => string
	dismiss: (id: string) => void
}

const [ToastContextProvider, useToast] = createContext<ToastContextValue>('Toast')

export { useToast }

export type ToastProviderProps = ToastViewportVariants & {
	children: React.ReactNode
}

let counter = 0

export function ToastProvider({ position = 'bottom-right', children }: ToastProviderProps) {
	const [toasts, setToasts] = useState<ToastData[]>([])

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id))
	}, [])

	const toast = useCallback((data: Omit<ToastData, 'id'>) => {
		const id = `toast-${++counter}`
		setToasts((prev) => [...prev, { ...data, id }])
		return id
	}, [])

	const isBottom = position?.startsWith('bottom')

	if (typeof document === 'undefined') {
		return <ToastContextProvider value={{ toast, dismiss }}>{children}</ToastContextProvider>
	}

	return (
		<ToastContextProvider value={{ toast, dismiss }}>
			{children}
			{createPortal(
				<div
					data-slot="toast-viewport"
					className={cn(toastViewportVariants({ position }), isBottom && 'flex-col-reverse')}
				>
					<AnimatePresence mode="popLayout">
						{toasts.map((t) => (
							<ToastCard key={t.id} toast={t} onDismiss={dismiss} />
						))}
					</AnimatePresence>
				</div>,
				document.body,
			)}
		</ToastContextProvider>
	)
}
