'use client'

import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { useHydrated } from '../../hooks/use-hydrated'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { useResponsiveValue } from '../../hooks/use-responsive-value'
import { useDirectionScope } from '../../primitives/direction'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/toast'
import { mapResponsive, type Responsive, resolveVariant } from '../../types'
import { subscribeDocumentEvent } from '../../utilities/document-listener'
import { getTabbableElements } from '../../utilities/focusable-selector'
import { useToastViewport } from './context'
import { ToastAlert } from './toast-alert'
import { TOAST_POSITION, type ToastPosition } from './types'

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
	// An `inert` item is a toast that leaves.
	for (const item of viewport?.querySelectorAll(':scope > ol > li:not([inert])') ?? []) {
		const target = getTabbableElements(item)[0]

		if (target) return target
	}

	return undefined
}

/** Props for {@link Toast}. */
export type ToastProps = {
	/**
	 * Where the toast stack anchors: a corner, or a full `top` or `bottom` edge.
	 * A `start` or `end` corner follows the reading direction. A per-breakpoint
	 * map sets the position from each breakpoint, mobile-first. A single value
	 * sets it at each width.
	 * @defaultValue {@link TOAST_POSITION}
	 */
	position?: Responsive<ToastPosition>
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
 * previous toast. This applies to each route that closes a toast: the close
 * button, an action that calls `dismiss(id)`, and an eviction by `maxToasts`. When it was the last toast, focus goes back to the element
 * that had focus before focus went into the stack (WCAG 2.4.3). A close while
 * focus is not in the toast does not move focus.
 *
 * While a toast shows, the viewport is a `section` with the name
 * "Notifications", so it is a `region` landmark, and a screen reader gets to
 * the stack from its landmark list. An empty viewport has no name and is not a
 * landmark. While a toast shows, F8 moves focus to the first control of the
 * newest toast that has one, and that focus pauses auto-dismiss. A keyboard user thus gets to an action such
 * as Undo before the toast times out (WCAG 2.1.1). F8 with a modifier key, and
 * an F8 that a different handler cancels first, do not move focus.
 *
 * Renders nothing on the server and during hydration; the portal mounts in an
 * effect afterwards, keeping the first client render identical to the SSR
 * output.
 *
 * By default the stack is on the full bottom edge below the `sm` breakpoint,
 * and in the bottom right corner from it. The order, the motion, and the gap of
 * the stack follow the edge of the position in force at the viewport.
 */
export function Toast({ position = TOAST_POSITION }: ToastProps) {
	const { toasts, dismiss, pause, resume, reset, handleExitComplete } = useToastViewport()

	const portalContainer = usePortalContainer()

	// The viewport portals out of the region that renders it, so it writes the
	// direction of the scope, as `Portal` does. A `start` or `end` position and
	// the text of each toast then follow that direction.
	const dir = useDirectionScope()

	// The recipe holds physical positions only, so a `start` or `end` corner
	// resolves against the direction of the scope first.
	const rtl = useIsRtl()

	const physical = mapResponsive(position, (value) => physicalPosition(value, rtl))

	// The order, the motion, and the gap of the stack follow the edge that the
	// stack is on at the viewport.
	const isTop = useResponsiveValue(physical, 'bottom').startsWith('top')

	// Gate on post-mount state rather than `typeof document`: an SSR/client
	// branch makes the first client render diverge from the server HTML and
	// trips React's hydration mismatch.
	const hydrated = useHydrated()

	const viewportRef = useRef<HTMLElement>(null)

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
				className={cn(k.viewport, resolveVariant(physical, k.position.viewport))}
			>
				{/* A list, so AT gives the count of the toasts and the position of each. */}
				<ol
					className={cn(
						k.scroll,
						resolveVariant(physical, k.position.scroll),
						!isTop && 'flex-col-reverse',
					)}
				>
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
								onLeave={() => moveFocusFromClosingToast(returnFocusRef.current)}
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
			getTabbableElements(neighbor)[0])
		: returnTo?.isConnected
			? returnTo
			: null

	target?.focus()
}

/** A physical {@link ToastPosition}: the recipe's key for each position. @internal */
type PhysicalPosition = Exclude<ToastPosition, `${string}-${'start' | 'end'}`>

/** The physical position of `position`: `start` and `end` resolve against `rtl`. @internal */
function physicalPosition(position: ToastPosition, rtl: boolean): PhysicalPosition {
	switch (position) {
		case 'top-start':
			return rtl ? 'top-right' : 'top-left'
		case 'top-end':
			return rtl ? 'top-left' : 'top-right'
		case 'bottom-start':
			return rtl ? 'bottom-right' : 'bottom-left'
		case 'bottom-end':
			return rtl ? 'bottom-left' : 'bottom-right'
		default:
			return position
	}
}
