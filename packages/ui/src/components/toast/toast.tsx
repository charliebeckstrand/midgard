'use client'

import { AnimatePresence } from 'motion/react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useToastViewport } from '../../providers/toast/context'
import type { ToastPosition } from '../../providers/toast/types'
import { k, toastViewportVariants } from '../../recipes/kata/toast'
import { ToastAlert } from './toast-alert'

export type ToastProps = {
	position?: ToastPosition
}

/**
 * Renders the toast queue from the surrounding `<ToastProvider>` into a
 * portal at the configured viewport position. Drop one anywhere inside the
 * provider's subtree (typically at the app shell) — siblings of `useToast()`
 * callers don't need to live next to it.
 */
export function Toast({ position = 'bottom-right' }: ToastProps) {
	const { toasts, dismiss, pause, resume, reset, handleExitComplete } = useToastViewport()

	const isBottom = position.startsWith('bottom')

	if (typeof document === 'undefined') return null

	return createPortal(
		<ReducedMotion>
			<output
				data-slot="toast-viewport"
				aria-live="polite"
				aria-atomic="false"
				className={cn(toastViewportVariants({ position }))}
			>
				<div className={cn(k.scroll, isBottom && 'flex-col-reverse')}>
					<AnimatePresence onExitComplete={handleExitComplete}>
						{toasts.map((t, i) => (
							<ToastAlert
								key={t.id}
								toast={t}
								position={position}
								zIndex={toasts.length - i}
								showCloseButton={t.showCloseButton}
								onOpenChange={(open, id) => {
									if (!open) dismiss(id)
								}}
								onPause={pause}
								onResume={resume}
								onReset={reset}
							/>
						))}
					</AnimatePresence>
				</div>
			</output>
		</ReducedMotion>,
		document.body,
	)
}
