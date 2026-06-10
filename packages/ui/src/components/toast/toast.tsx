'use client'

import { AnimatePresence } from 'motion/react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useToastViewport } from '../../providers/toast/context'
import type { ToastPosition } from '../../providers/toast/types'
import { k } from '../../recipes/kata/toast'
import { ToastAlert } from './toast-alert'

export type ToastProps = {
	position?: ToastPosition
}

/**
 * Renders the toast queue from the surrounding `<ToastProvider>` into a
 * portal at the configured viewport position. Drop one anywhere inside the
 * provider's subtree (e.g. the app shell); it need not sit next to
 * `useToast()` callers.
 */
export function Toast({ position = 'bottom-right' }: ToastProps) {
	const { toasts, dismiss, pause, resume, reset, handleExitComplete } = useToastViewport()

	const portalContainer = usePortalContainer()

	const isBottom = position.startsWith('bottom')

	if (typeof document === 'undefined') return null

	return createPortal(
		<ReducedMotion>
			{/* Not itself a live region: each toast carries its own `role` (status /
			    alert) mapping severity to politeness directly. */}
			<div data-slot="toast-viewport" className={cn(k.viewport({ position }))}>
				<div className={cn(k.scroll, isBottom && 'flex-col-reverse')}>
					<AnimatePresence onExitComplete={handleExitComplete}>
						{toasts.map((t, i) => (
							<ToastAlert
								key={t.id}
								toast={t}
								position={position}
								zIndex={toasts.length - i}
								closable={t.closable}
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
			</div>
		</ReducedMotion>,
		portalContainer ?? document.body,
	)
}
