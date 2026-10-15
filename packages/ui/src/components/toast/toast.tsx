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
import { tabbablesIn } from '../../utilities/focusable-selector'
import { useToastViewport } from './context'
import { ToastAlert } from './toast-alert'
import type { ToastPosition } from './types'

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
 * persistent announcer on mount (WCAG 4.1.3). Auto-dismiss pauses while a
 * hovering pointer or focus is inside a toast (WCAG 2.2.1). A touch does not
 * pause it.
 *
 * When a toast that has focus closes, focus goes to the next toast, else to the
 * previous toast. When it was the last toast, focus goes back to the element
 * that had focus before focus went into the stack (WCAG 2.4.3). A close while
 * focus is not in the toast does not move focus.
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

	// The element that held focus before focus entered the stack. When the last
	// toast closes, focus goes back to it.
	const returnFocusRef = useRef<HTMLElement | null>(null)

	// The viewport mounts after hydration, so the effect keys on it. The
	// `relatedTarget` of a focus that comes from outside the viewport is the
	// element to return to.
	useEffect(() => {
		const viewport = viewportRef.current

		if (!hydrated || !viewport) return

		const onFocusIn = (event: FocusEvent) => {
			const from = event.relatedTarget

			if (from instanceof HTMLElement && !viewport.contains(from)) returnFocusRef.current = from
		}

		viewport.addEventListener('focusin', onFocusIn)

		return () => viewport.removeEventListener('focusin', onFocusIn)
	}, [hydrated])

	if (!hydrated) return null

	return createPortal(
		// `layout`: each toast FLIPs into the slot of a toast that leaves.
		<ReducedMotion layout>
			{/* Not itself a live region: each toast carries its own `role` (status /
			    alert) mapping severity to politeness directly. */}
			<div
				ref={viewportRef}
				data-slot="toast-viewport"
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
									if (open) return

									moveFocusFromClosingToast(returnFocusRef.current)

									// The only dismissal a reader drives directly, so it names itself.
									dismiss(id, 'close')
								}}
								onPause={pause}
								onResume={resume}
								onReset={reset}
							/>
						))}
					</AnimatePresence>
				</ol>
			</div>
		</ReducedMotion>,
		portalContainer ?? document.body,
	)
}

/**
 * Moves focus out of the toast that closes, before its item goes `inert` and
 * focus falls to the body (WCAG 2.4.3). Focus goes to the next toast in the
 * list, else to the previous one, else to `returnTo`. When focus is not in a
 * toast, as on a close by pointer, nothing moves.
 * @internal
 */
function moveFocusFromClosingToast(returnTo: HTMLElement | null) {
	const active = document.activeElement

	const item = active?.closest('[data-slot="toast-viewport"] li')

	if (!item) return

	// The items in list order, less the ones that already leave.
	const items = Array.from(item.parentElement?.children ?? []).filter(
		(sibling) => sibling === item || !sibling.hasAttribute('inert'),
	)

	const index = items.indexOf(item)

	const neighbor = items[index + 1] ?? items[index - 1]

	const target = neighbor
		? (neighbor.querySelector<HTMLElement>('button[aria-label="Dismiss"]') ??
			tabbablesIn(neighbor)[0])
		: returnTo?.isConnected
			? returnTo
			: null

	target?.focus()
}
