'use client'

import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { useHydrated } from '../../hooks/use-hydrated'
import { useMinBreakpoint } from '../../hooks/use-min-breakpoint'
import { useDirectionScope } from '../../primitives/direction'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/toast'
import { subscribeDocumentEvent } from '../../utilities/document-listener'
import { tabbablesIn } from '../../utilities/focusable-selector'
import { useToastViewport } from './context'
import { ToastAlert } from './toast-alert'
import type { ToastPosition } from './types'

/** True for an F8 with no modifier key that no handler canceled first. @internal */
function isPlainF8(event: KeyboardEvent) {
	if (event.key !== 'F8' || event.defaultPrevented) return false

	return !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
}

/**
 * The first control of the newest toast that has one. The viewport gets the
 * newest toast first, so the first item of the list is the newest.
 * @internal
 */
function firstControlOfNewest(viewport: HTMLElement | null) {
	for (const item of viewport?.querySelectorAll(':scope > ol > li') ?? []) {
		const target = tabbablesIn(item)[0]

		if (target) return target
	}

	return undefined
}

/** Props for {@link Toast}. */
export type ToastProps = {
	/**
	 * The viewport corner that the toast stack anchors to. A `start` or `end`
	 * corner follows the reading direction. Below the `sm` breakpoint, the stack
	 * is on the bottom edge.
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
 * severity to politeness via its own `role`. `warning` and `error` interrupt as
 * `alert`. Everything else queues as `status`, and is mirrored through a
 * persistent announcer on mount (WCAG 4.1.3). Auto-dismiss pauses while the
 * pointer or focus is inside a toast (WCAG 2.2.1).
 *
 * While a toast shows, the viewport is a `section` with the name
 * "Notifications", so it is a `region` landmark, and a screen reader gets to
 * the stack from its landmark list. An empty viewport has no name and is not a
 * landmark. While a toast shows, F8 moves focus to the first control of the newest toast that has one, and
 * that focus pauses auto-dismiss. A keyboard user thus gets to an action such
 * as Undo before the toast times out (WCAG 2.1.1). F8 with a modifier key, and
 * an F8 that a different handler cancels first, do not move focus.
 *
 * Renders nothing on the server and during hydration; the portal mounts in an
 * effect afterwards, keeping the first client render identical to the SSR
 * output.
 *
 * Below the `sm` breakpoint, each `position` stacks on the bottom edge. A `top-*`
 * stack there takes the order, the motion, and the gap of a bottom stack.
 */
export function Toast({ position = 'bottom-right' }: ToastProps) {
	const { toasts, dismiss, pause, resume, reset, handleExitComplete } = useToastViewport()

	const portalContainer = usePortalContainer()

	// The viewport portals out of the region that renders it, so it writes the
	// direction of the scope, as `Portal` does. A `start` or `end` position and
	// the text of each toast then follow that direction.
	const dir = useDirectionScope()

	// Below `sm`, the viewport pins every position to the bottom edge. The order,
	// the motion, and the gap of the stack follow the edge that the stack is on.
	const isDesktop = useMinBreakpoint('sm')

	const isTop = isDesktop && position.startsWith('top')

	// Gate on post-mount state rather than `typeof document`: an SSR/client
	// branch makes the first client render diverge from the server HTML and
	// trips React's hydration mismatch.
	const hydrated = useHydrated()

	const viewportRef = useRef<HTMLDivElement>(null)

	const hasToasts = toasts.length > 0

	// F8 moves focus into the stack, as in Radix. The stack is at the end of the
	// body, so Tab gets to it only after the full page.
	useEffect(() => {
		if (!hasToasts) return

		return subscribeDocumentEvent('keydown', (event) => {
			if (!isPlainF8(event)) return

			const target = firstControlOfNewest(viewportRef.current)

			if (!target) return

			event.preventDefault()

			target.focus()
		})
	}, [hasToasts])

	if (!hydrated) return null

	return createPortal(
		// `layout`: each toast FLIPs into the slot of a toast that leaves.
		<ReducedMotion layout>
			{/* A named `section` is a `region` landmark. The viewport is not a live
			    region: each toast carries its own `role` (status / alert) mapping
			    severity to politeness directly. */}
			<section
				ref={viewportRef}
				data-slot="toast-viewport"
				// Named only while it holds a toast: an empty stack is no landmark, and
				// two empty stacks on one page do not give two of the same name.
				aria-label={hasToasts ? 'Notifications' : undefined}
				dir={dir ?? undefined}
				className={cn(k.viewport({ position }))}
			>
				{/* A list, so AT gives the count of the toasts and the position of each. */}
				<ol className={cn(k.scroll, !isTop && 'flex-col-reverse')}>
					<AnimatePresence onExitComplete={handleExitComplete}>
						{toasts.map((toast, index) => (
							<ToastAlert
								key={toast.id}
								toast={toast}
								edge={isTop ? 'top' : 'bottom'}
								zIndex={toasts.length - index}
								closable={toast.closable}
								onOpenChange={(open, id) => {
									// The only dismissal a reader drives directly, so it names itself.
									if (!open) dismiss(id, 'close')
								}}
								onPause={pause}
								onResume={resume}
								onReset={reset}
							/>
						))}
					</AnimatePresence>
				</ol>
			</section>
		</ReducedMotion>,
		portalContainer ?? document.body,
	)
}
