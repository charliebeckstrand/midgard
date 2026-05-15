'use client'

import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, toastViewportVariants } from '../../recipes/kata/toast'
import { ToastAlert } from './toast-alert'
import { ToastContext, type ToastProps, useToastState } from './toast-context'

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
				<ReducedMotion>
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
					</output>
				</ReducedMotion>,
				document.body,
			)}
		</ToastContext>
	)
}
