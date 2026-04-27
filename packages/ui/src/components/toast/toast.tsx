'use client'

import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { ToastAlert } from './alert'
import { ToastContext, type ToastProps, useToastState } from './toast-context'
import { k, toastViewportVariants } from './variants'

export function Toast({
	position = 'bottom-right',
	duration = 5000,
	maxToasts = 5,
	children,
}: ToastProps) {
	const { toasts, toast, dismiss, pause, resume, handleExitComplete, isBottom } = useToastState({
		position,
		duration,
		maxToasts,
	})

	const ctx = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

	if (typeof document === 'undefined') {
		return <ToastContext value={ctx}>{children}</ToastContext>
	}

	return (
		<ToastContext value={ctx}>
			{children}
			{createPortal(
				<output
					data-slot="toast-viewport"
					aria-live="polite"
					aria-atomic="false"
					className={cn(toastViewportVariants({ position }))}
				>
					<div className={cn(k.scroll, isBottom && 'flex-col-reverse')}>
						<AnimatePresence onExitComplete={handleExitComplete}>
							{toasts.map((t) => (
								<ToastAlert
									key={t.id}
									toast={t}
									position={position}
									showCloseButton={t.showCloseButton}
									onOpenChange={(open, id) => {
										if (!open) dismiss(id)
									}}
									onPause={pause}
									onResume={resume}
								/>
							))}
						</AnimatePresence>
					</div>
				</output>,
				document.body,
			)}
		</ToastContext>
	)
}
