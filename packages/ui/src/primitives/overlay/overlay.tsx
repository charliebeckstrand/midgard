'use client'

import { FloatingFocusManager, useFloating } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { type HTMLAttributes, type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { useDismissable } from '../../hooks/use-dismissable'
import { useScrollLock } from '../../hooks/use-scroll-lock'
import { k } from '../../recipes/kata/overlay'
import { usePortalContainer } from '../portal'
import { ReducedMotion } from '../reduced-motion'
import { notifyOverlaySignal } from './overlay-signal'

type OverlayProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	dismissOnBackdrop?: boolean
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Optional element to portal into. When provided, the overlay is scoped to this
	 * element (rendered with `absolute` positioning, no body scroll lock). The container
	 * must establish a positioning context (e.g. `position: relative`).
	 *
	 * @defaultValue `document.body` with full-viewport `fixed` positioning
	 */
	container?: HTMLElement | null
	/**
	 * Element to receive initial focus when the overlay opens.
	 *
	 * @defaultValue the first tabbable child
	 */
	initialFocus?: RefObject<HTMLElement | null>
	/**
	 * Modal overlays (the default) trap focus, move it into the panel on open,
	 * lock body scroll, and dim the page behind a blocking backdrop. Pass
	 * `false` for transient, pointer-driven surfaces (e.g. a hover-revealed
	 * sheet) that must not steal focus or block the page: no backdrop renders,
	 * the page behind stays interactive (the panel re-enables its own pointer
	 * events), and Escape or a pointer press outside the panel dismisses.
	 */
	modal?: boolean
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

/**
 * Portalled backdrop-and-panel shell for modal surfaces (Dialog, Sheet,
 * Drawer). Manages focus trapping, body scroll lock, dismissal, and the
 * dimming backdrop; consumers render the panel as `children`.
 *
 * @remarks Client-only: returns `null` during SSR. Renders into the explicit
 * `container`, else the ambient `<UIProvider>` portal node, else
 * `document.body`. A `container` scopes the overlay to that element
 * (`absolute`, no scroll lock); `modal={false}` drops the backdrop and focus
 * management for transient pointer-driven surfaces. Fires the overlay signal
 * on open so non-modal floats (tooltips) dismiss.
 */
export function Overlay({
	open,
	onOpenChange,
	dismissOnBackdrop = true,
	glass,
	className,
	children,
	container,
	initialFocus,
	modal = true,
	...props
}: OverlayProps) {
	const { refs, context } = useFloating({ open, onOpenChange })

	const scoped = container != null

	// Explicit `container` (scoped overlay) wins; otherwise falls back to the
	// ambient <UIProvider>, then document.body. The provider relocates the
	// portal mount only; modal positioning and scroll lock key off `scoped`.
	const portalContainer = usePortalContainer(container)

	const containerRef = useRef<HTMLDivElement>(null)

	useDismissable({
		open,
		onDismiss: () => onOpenChange(false),
		// Modal overlays own outside-press dismissal via the blocking backdrop's
		// click handler; non-modal overlays render no backdrop, so outside
		// pointer presses dismiss directly.
		outsidePointer: !modal && dismissOnBackdrop,
		containerRef,
	})

	useScrollLock(open && !scoped && modal)

	useEffect(() => {
		if (open) notifyOverlaySignal()
	}, [open])

	if (typeof document === 'undefined') return null

	const panel = (
		<div
			ref={(node) => {
				refs.setFloating(node)

				containerRef.current = node
			}}
			data-slot="overlay"
			className={cn('inset-0 z-99', scoped ? 'absolute' : 'fixed', !modal && 'pointer-events-none')}
			{...props}
		>
			{modal && (
				<motion.div
					{...k.motion}
					data-slot="overlay-backdrop"
					className={
						className ?? cn('absolute inset-0', glass ? k.backdrop.glass : k.backdrop.base)
					}
					onClick={dismissOnBackdrop ? () => onOpenChange(false) : undefined}
					aria-hidden="true"
				/>
			)}
			{children}
		</div>
	)

	return createPortal(
		<ReducedMotion>
			<AnimatePresence>
				{open &&
					// Non-modal overlays skip focus management entirely: no trap, no
					// initial-focus steal, no focus return; focus stays where it is.
					(modal ? (
						<FloatingFocusManager context={context} modal initialFocus={initialFocus ?? undefined}>
							{panel}
						</FloatingFocusManager>
					) : (
						panel
					))}
			</AnimatePresence>
		</ReducedMotion>,
		portalContainer ?? document.body,
	)
}
