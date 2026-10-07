'use client'

import {
	FloatingFocusManager,
	type FloatingRootContext,
	useFloatingRootContext,
} from '@floating-ui/react'
import { motion } from 'motion/react'
import {
	type ComponentProps,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { useDismissable } from '../../hooks/use-dismissable'
import { useScrollLock } from '../../hooks/use-scroll-lock'
import { k } from '../../recipes/kata/overlay'
import { chromeRegions } from '../chrome'
import { Portal } from '../portal'
import { notifyOverlaySignal } from './overlay-signal'

/**
 * Props for {@link Overlay}: the `open` / `onOpenChange` pair, the `modal` and
 * `backdrop` behavior flags, and the optional portal `container`,
 * `initialFocus` target.
 */
export type OverlayProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * Whether a press on the backdrop closes the overlay.
	 * @defaultValue true
	 */
	dismissOnBackdrop?: boolean
	/**
	 * Class for the dimming backdrop. It fully replaces the backdrop's default
	 * classes (including `absolute inset-0`), and applies only when the backdrop
	 * paints; with `backdrop={false}` it has no effect.
	 *
	 * @remarks
	 * The one channel that styles the backdrop. Every panel drives its glass
	 * surface through its own recipe's `backdrop` here, so nothing can be set
	 * and then silently outranked.
	 */
	backdropClassName?: string
	children: ReactNode
	/**
	 * Optional element to portal into. When provided, the overlay is scoped to this
	 * element (rendered with `absolute` positioning, no body scroll lock). The container
	 * must establish a positioning context (e.g. `position: relative`).
	 *
	 * @defaultValue `document.body` with full-viewport `fixed` positioning.
	 */
	container?: HTMLElement | null
	/**
	 * Element to receive initial focus when the overlay opens.
	 *
	 * @defaultValue the first tabbable child.
	 */
	initialFocus?: RefObject<HTMLElement | null>
	/**
	 * Modal overlays (the default) trap focus, move it into the panel on open,
	 * lock body scroll, and dim the page behind a blocking backdrop. Pass
	 * `false` for transient, pointer-driven surfaces that must not steal focus or
	 * block the page. A hover-revealed sheet is the example. No backdrop renders
	 * unless `backdrop` is set. The page behind stays interactive, because the
	 * panel re-enables its own pointer events. Escape or a pointer press outside
	 * the panel dismisses.
	 * @defaultValue true
	 */
	modal?: boolean
	/**
	 * Paint the dimming backdrop independently of modality. A non-modal surface,
	 * such as a hover-revealed sheet, can opt in to blur and dim the page while
	 * staying interactive. The backdrop inherits the wrapper's
	 * `pointer-events-none`, so it never intercepts a press.
	 *
	 * The flag changes paint only. A modal overlay with `backdrop={false}` keeps
	 * a backdrop with no paint, so it still closes on a press outside the panel,
	 * unless `dismissOnBackdrop` is `false`.
	 *
	 * @defaultValue modal
	 */
	backdrop?: boolean
} & Omit<ComponentProps<'div'>, 'children'>

/**
 * Portaled backdrop-and-panel shell for modal surfaces (Dialog, Sheet,
 * Drawer). Manages focus trapping, body scroll lock, dismissal, and the
 * dimming backdrop; consumers render the panel as `children`.
 *
 * @remarks Client-only: returns `null` during SSR. Renders into the explicit
 * `container`, else the ambient `<UIProvider>` portal node, else
 * `document.body`. A `container` scopes the overlay to that element
 * (`absolute`, no scroll lock). For transient pointer-driven surfaces,
 * `modal={false}` drops focus management, scroll lock, and the backdrop (unless
 * `backdrop` is set). Any `Chrome` region stays reachable through the
 * trap without modality being given up. Fires the overlay signal on open so
 * non-modal floats (tooltips) dismiss. A click on the backdrop stops at the
 * backdrop, so the React ancestors of the overlay do not receive it.
 *
 * A closed overlay is `inert` for its exit animation, so it takes no press and
 * no key. The focus goes to `<body>` when the overlay closes, and a modal
 * overlay returns it to the trigger at unmount.
 *
 * The portal carries the density scope and the direction of the place that
 * opened the overlay (see {@link Portal}), so the panel follows that place.
 */
export function Overlay({
	open,
	onOpenChange,
	dismissOnBackdrop = true,
	backdropClassName,
	children,
	container,
	initialFocus,
	modal = true,
	backdrop = modal,
	className,
	ref,
	...props
}: OverlayProps) {
	// The overlay places itself with CSS, so it takes the root context, which
	// has the open state and the elements that the focus manager reads, and no
	// position engine.
	const [floating, setFloating] = useState<HTMLElement | null>(null)

	const context = useFloatingRootContext({
		open,
		onOpenChange,
		elements: { reference: null, floating },
	})

	// `Portal` owns the teleport and the mount-while-open lifecycle. An
	// explicit `container` scopes the overlay to that element (`absolute`, no
	// scroll lock); modal positioning and scroll lock key off `scoped`.
	const scoped = container != null

	const containerRef = useRef<HTMLDivElement>(null)

	const setPanel = useComposedRef<HTMLDivElement>(setFloating, containerRef, ref)

	useDismissable({
		open,
		onDismiss: () => onOpenChange(false),
		// A modal overlay owns outside-press dismissal through a click on the
		// backdrop, or on its root when no backdrop renders. A non-modal overlay
		// blocks nothing, so an outside pointer press dismisses it directly.
		outsidePointer: !modal && dismissOnBackdrop,
		containerRef,
	})

	useScrollLock(open && !scoped && modal)

	// A modal press outside the panel lands on the backdrop. With no paint, the
	// backdrop stays for that press alone.
	const catchesPress = modal && dismissOnBackdrop

	useEffect(() => {
		if (open) notifyOverlaySignal()
	}, [open])

	const inert = props.inert === true

	// A closed overlay stays on screen for its exit animation, and its subtree
	// keeps the handlers of the last open render. It must take no input in that
	// time. If it does, a second press runs an action again, and the backdrop
	// takes a press that is for the page below. `inert` stops the pointer and
	// the keyboard. `pointer-events: none` is not sufficient, because a panel
	// sets `pointer-events-auto` on itself.
	//
	// The effect writes to the node, not to a prop. `AnimatePresence` holds the
	// exiting subtree at the props of its last open render, so a prop keyed on
	// `open` never gets to it.
	//
	// `inert` moves the focus out of the panel, but Chromium does this in a
	// later task. Until then, a fast second Enter still clicks the focused
	// button. Thus the effect moves the focus to `<body>` at once. The focus
	// manager then returns the focus at unmount, as before.
	useLayoutEffect(() => {
		const node = containerRef.current

		if (!node) return

		node.toggleAttribute('inert', inert || !open)

		if (open) return

		const active = node.ownerDocument.activeElement

		if (active instanceof HTMLElement && node.contains(active)) active.blur()
	}, [open, inert])

	const panel = (
		<div
			ref={setPanel}
			data-slot="overlay"
			{...props}
			className={cn(
				k.base,
				scoped ? k.scoped : k.frame,
				!modal && 'pointer-events-none',
				className,
			)}
		>
			{(backdrop || catchesPress) && (
				<motion.div
					{...k.motion}
					data-slot="overlay-backdrop"
					className={
						backdrop
							? (backdropClassName ?? cn('absolute inset-0', k.backdrop.base))
							: 'absolute inset-0'
					}
					// React carries a click in the portal up the component tree, and each
					// panel stops its own clicks. The backdrop stops its clicks too. If it
					// did not, the press that dismisses a menu sheet would also click the
					// grid row that holds the menu.
					onClick={(event) => {
						event.stopPropagation()

						if (dismissOnBackdrop) onOpenChange(false)
					}}
					aria-hidden="true"
				/>
			)}
			{children}
		</div>
	)

	return (
		<Portal open={open} container={container}>
			<OverlayFocus modal={modal} context={context} initialFocus={initialFocus}>
				{panel}
			</OverlayFocus>
		</Portal>
	)
}

/**
 * Wraps the overlay panel in a modal `FloatingFocusManager`, which traps focus,
 * moves it in on open, and restores it on close. A non-modal surface renders
 * bare: no trap, no initial-focus steal, no focus return. Focus stays where it
 * is.
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
	context: FloatingRootContext
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
	// strict, which is the whole behavior on a page that declares no chrome.
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
