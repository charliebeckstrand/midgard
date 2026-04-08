'use client'

import { AnimatePresence } from 'motion/react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { ToastCard } from './toast-card'
import { ToastContext, type ToastContextProps, useToastState } from './toast-context'
import { toastViewportVariants } from './variants'

export function Toast({
	position = 'bottom-right',
	duration = 5000,
	maxToasts = 5,
	closeIcon,
	children,
}: ToastContextProps) {
	const { toasts, toast, dismiss, pause, resume, handleExitComplete, isBottom } = useToastState({
		position,
		duration,
		maxToasts,
	})

	if (typeof document === 'undefined') {
		return <ToastContext value={{ toast, dismiss }}>{children}</ToastContext>
	}

	return (
		<ToastContext value={{ toast, dismiss }}>
			{children}
			{createPortal(
				<div data-slot="toast-viewport" className={cn(toastViewportVariants({ position }))}>
					<div className={cn(katachi.toast.scroll, isBottom && 'flex-col-reverse')}>
						<AnimatePresence onExitComplete={handleExitComplete}>
							{toasts.map((t) => (
								<ToastCard
									key={t.id}
									toast={t}
									position={position}
									showCloseButton={t.showCloseButton}
									closeIcon={closeIcon}
									onDismiss={dismiss}
									onPause={pause}
									onResume={resume}
								/>
							))}
						</AnimatePresence>
					</div>
				</div>,
				document.body,
			)}
		</ToastContext>
	)
}
