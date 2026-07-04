'use client'

import { FloatingFocusManager, FloatingPortal, useFloating } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type HTMLAttributes,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useDismissable } from '../../hooks/use-dismissable'
import { useScrollLock } from '../../hooks/use-scroll-lock'
import { k } from '../../recipes/kata/overlay'
import { usePortalContainer } from '../portal'
import { ReducedMotion } from '../reduced-motion'
import { notifyOverlaySignal } from './overlay-signal'

/**
 * Props for {@link Overlay}: the `open` / `onOpenChange` pair, the `modal` and
 * `backdrop` behavior flags, and the optional portal `container` and
 * `initialFocus` target.
 */
export type OverlayProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	dismissOnBackdrop?: boolean
	glass?: boolean
	/**
	 * Class for the dimming backdrop — not the root. It fully replaces the
	 * backdrop's default classes (including `absolute inset-0`), and applies
	 * only when a backdrop renders; with `backdrop={false}` it has no effect.
	 */
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
	 * sheet) that must not steal focus or block the page: no backdrop renders
	 * (unless `backdrop` is set), the page behind stays interactive (the panel
	 * re-enables its own pointer events), and Escape or a pointer press outside
	 * the panel dismisses.
	 */
	modal?: boolean
	/**
	 * Paint the dimming backdrop independently of modality. A non-modal surface
	 * (e.g. a hover-revealed sheet) can opt in to blur and dim the page while
	 * staying interactive: the backdrop inherits the wrapper's
	 * `pointer-events-none`, so it never intercepts a press.
	 *
	 * @defaultValue `modal`
	 */
	backdrop?: boolean
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

/**
 * Portalled backdrop-and-panel shell for modal surfaces (Dialog, Sheet,
 * Drawer). Manages focus trapping, body scroll lock, dismissal, and the
 * dimming backdrop; consumers render the panel as `children`.
 *
 * @remarks Client-only: returns `null` during SSR. Renders into the explicit
 * `container`, else the ambient `<UIProvider>` portal node, else
 * `document.body`. A `container` scopes the overlay to that element
 * (`absolute`, no scroll lock); for transient pointer-driven surfaces
 * `modal={false}` drops focus management, scroll lock, and the backdrop (unless
 * `backdrop` is set). Fires the overlay signal on open so non-modal floats
 * (tooltips) dismiss.
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
	backdrop = modal,
	...props
}: OverlayProps) {
	const { refs, context } = useFloating({ open, onOpenChange })

	// Mount the portal only while open or animating out, so a closed overlay leaves
	// no `[data-floating-ui-portal]` node behind (a page of many closed overlays —
	// e.g. one filter drawer per column — would otherwise strand an empty div
	// each). `mounted` flips on with `open` and off once the exit animation ends.
	const [mounted, setMounted] = useState(open)

	if (open && !mounted) setMounted(true)

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

	if (!mounted) return null

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
			{backdrop && (
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

	// Teleport through floating-ui's portal (not React's `createPortal`) so a
	// floating menu opened inside the overlay — a `Select` listbox, a date picker —
	// nests in the portal context and is excluded from the modal focus manager's
	// `markOthers`; React's portal left those nested surfaces inert and unreachable.
	return (
		<FloatingPortal root={portalContainer ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={() => setMounted(false)}>
					{open && (
						<OverlayFocus modal={modal} context={context} initialFocus={initialFocus}>
							{panel}
						</OverlayFocus>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}

/**
 * Wraps the overlay panel in a modal `FloatingFocusManager` (trap focus, move it
 * in on open, restore on close), or renders it bare for a non-modal surface — no
 * trap, no initial-focus steal, no focus return; focus stays where it is.
 *
 * @internal
 */
function OverlayFocus({
	modal,
	context,
	initialFocus,
	children,
}: {
	modal: boolean
	context: ReturnType<typeof useFloating>['context']
	initialFocus: RefObject<HTMLElement | null> | undefined
	children: ReactElement
}) {
	if (!modal) return children

	return (
		<FloatingFocusManager context={context} modal initialFocus={initialFocus ?? undefined}>
			{children}
		</FloatingFocusManager>
	)
}
