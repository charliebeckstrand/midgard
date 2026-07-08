'use client'

import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useToastViewport } from '../../providers/toast/context'
import type { ToastPosition } from '../../providers/toast/types'
import { k } from '../../recipes/kata/toast'
import { ToastAlert } from './toast-alert'

/** Props for {@link Toast}. */
export type ToastProps = {
	/**
	 * Viewport corner/edge the toast stack anchors to.
	 * @defaultValue 'bottom-right'
	 */
	position?: ToastPosition
}

/**
 * Renders the toast queue from the surrounding `<ToastProvider>` into a
 * portal at the configured viewport position. Drop one anywhere inside the
 * provider's subtree (e.g. the app shell); it need not sit next to
 * `useToast()` callers.
 *
 * @remarks The viewport is not itself a live region. Each toast maps its
 * severity to politeness via its own `role`: `warning`/`error` interrupt as
 * `alert`, everything else queues as `status` and is mirrored through a
 * persistent announcer on mount (WCAG 4.1.3). Auto-dismiss pauses while the
 * pointer or focus is inside a toast (WCAG 2.2.1).
 *
 * Renders nothing on the server and during hydration; the portal mounts in an
 * effect afterwards, keeping the first client render identical to the SSR
 * output.
 */
export function Toast({ position = 'bottom-right' }: ToastProps) {
	const { toasts, dismiss, pause, resume, reset, handleExitComplete } = useToastViewport()

	const portalContainer = usePortalContainer()

	const isBottom = position.startsWith('bottom')

	// Gate on post-mount state rather than `typeof document`: an SSR/client
	// branch makes the first client render diverge from the server HTML and
	// trips React's hydration mismatch.
	const [hydrated, setHydrated] = useState(false)

	useEffect(() => {
		setHydrated(true)
	}, [])

	if (!hydrated) return null

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
