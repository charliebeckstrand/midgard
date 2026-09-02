'use client'

import { type FloatingContext, FloatingFocusManager, useFloating } from '@floating-ui/react'
import { motion } from 'motion/react'
import {
	type HTMLAttributes,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
} from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { useDismissable } from '../../hooks/use-dismissable'
import { useEnterAnimation } from '../../hooks/use-enter-animation'
import { useScrollLock } from '../../hooks/use-scroll-lock'
import { k } from '../../recipes/kata/overlay'
import { chromeRegions } from '../chrome'
import { PresencePortal } from '../portal'
import { notifyOverlaySignal } from './overlay-signal'

/**
 * Props for {@link Overlay}: the `open` / `onOpenChange` pair, the `modal` and
 * `backdrop` behavior flags, and the optional portal `container`,
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
	 * Whether the backdrop plays its enter animation on mount.
	 *
	 * `false` mounts it already in place. For a surface that is open because the URL says
	 * so — a restored route, a pasted deep link — the fade announces an opening the user
	 * never performed, and on a route that remounts it replays on every arrival.
	 *
	 * It suppresses that arrival only. A surface that closes and opens again while still
	 * mounted plays the enter every time, whatever this says: by then the open is the
	 * user's own doing.
	 *
	 * @defaultValue true
	 */
	animateOnMount?: boolean
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
 * `backdrop` is set). Any `PersistentChrome` region stays reachable through the
 * trap without modality being given up. Fires the overlay signal on open so
 * non-modal floats (tooltips) dismiss.
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
	animateOnMount = true,
	...props
}: OverlayProps) {
	const { refs, context } = useFloating({ open, onOpenChange })

	const animateEnter = useEnterAnimation(open, animateOnMount)

	// `PresencePortal` owns the teleport and the mount-while-open lifecycle. An
	// explicit `container` scopes the overlay to that element (`absolute`, no
	// scroll lock); modal positioning and scroll lock key off `scoped`.
	const scoped = container != null

	const containerRef = useRef<HTMLDivElement>(null)

	const setPanel = useComposedRef<HTMLDivElement>(refs.setFloating, containerRef)

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

	const panel = (
		<div
			ref={setPanel}
			data-slot="overlay"
			className={cn(k.root, scoped ? 'absolute' : 'fixed', !modal && 'pointer-events-none')}
			{...props}
		>
			{backdrop && (
				<motion.div
					{...k.motion}
					// After the preset spread, so it overrides the preset's own `initial`.
					initial={animateEnter ? k.motion.initial : false}
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

	return (
		<PresencePortal open={open} container={container}>
			<OverlayFocus modal={modal} context={context} initialFocus={initialFocus}>
				{panel}
			</OverlayFocus>
		</PresencePortal>
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
	context: FloatingContext
	initialFocus: RefObject<HTMLElement | null> | undefined
	children: ReactElement
}) {
	if (!modal) return children

	// Two halves enforce the trap, and a registered region has to relax both. The
	// focus guards bounce a Tab that reaches the panel's edge back inside, so
	// `guards={false}` retires them, and `outsideElementsInert` then marks sealed
	// content `inert` rather than `aria-hidden` — which is what holds the tab order
	// off the sealed page once no guard is left to do it. `getInsideElements` hands
	// the registered regions through as part of the surface, exempting them.
	//
	// Read at render rather than hoisted: with nothing registered the trap stays
	// strict, which is the whole behaviour on a page that declares no chrome.
	const chrome = chromeRegions()

	// `guards={false}` alone already forces the `inert` marking in 0.27, so this
	// states the intent through the prop that documents it rather than resting on
	// the other one's side effect, which no version promises to keep.
	return (
		<FloatingFocusManager
			context={context}
			modal
			initialFocus={initialFocus}
			guards={chrome.length === 0}
			outsideElementsInert={chrome.length > 0}
			getInsideElements={chromeRegions}
		>
			{children}
		</FloatingFocusManager>
	)
}
