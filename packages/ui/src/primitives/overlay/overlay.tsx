'use client'

import {
	FloatingFocusManager,
	type FloatingRootContext,
	useFloatingRootContext,
} from '@floating-ui/react'
import { useComposedRefs, useIsPresent } from 'motion/react'
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
import { cn } from '../../core/cn'
import { useDismissable } from '../../hooks/use-dismissable'
import { useScrollLock } from '../../hooks/use-scroll-lock'
import { k } from '../../recipes/kata/overlay'
import { registerOverlayLayer } from '../../utilities/overlay-layers'
import { Portal } from '../portal'
import * as m from '../reduced-motion/reduced-motion-elements'
import { notifyOverlaySignal } from './overlay-signal'
import { useOverlayInitialFocus } from './use-overlay-initial-focus'
import { useOverlayReturnFocus } from './use-overlay-return-focus'
import { useOverlayViewportFit } from './use-overlay-viewport-fit'

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
	 * must establish a positioning context (e.g. `position: relative`). The overlay
	 * clips its content to the box of the container, so the focus that moves into a
	 * sliding panel does not scroll the container.
	 *
	 * A modal overlay seals the box that it covers. With a container, it seals
	 * only the container. The rest of the page stays in the focus order, in the
	 * accessibility tree, and clickable. A work surface under persistent app
	 * chrome, such as a maximized drawer under a tab strip, thus keeps the chrome
	 * reachable. Give it a container that is the box under the chrome.
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
	 * Element to receive the focus when a modal overlay closes. Give it when
	 * the focus belongs elsewhere. Also give it when the element that had the
	 * focus as the overlay opened can be gone at the close.
	 *
	 * @defaultValue the element that had the focus as the overlay opened.
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
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
 * @remarks An overlay that is open in the server render is part of the page.
 * It renders in place on the server and in the hydration render, so it paints
 * with the server HTML. Hydration then moves it into its portal at rest, with
 * no enter animation, and the panel does not report an arrival. Until the
 * move, an ancestor with a `transform`, a `filter`, or `contain` is the
 * containing block of the overlay. A closed overlay renders nothing on the
 * server.
 *
 * Renders into the explicit `container`, else the ambient `<UIProvider>` portal node, else
 * `document.body`. A `container` scopes the overlay to that element
 * (`absolute`, no scroll lock). For transient pointer-driven surfaces,
 * `modal={false}` drops focus management, scroll lock, and the backdrop (unless
 * `backdrop` is set). A modal overlay seals the box that it covers: the page
 * for an overlay fixed to the viewport, or the `container`. Fires the overlay signal on open so
 * non-modal floats (tooltips) dismiss. A modal overlay, or one with a backdrop,
 * also hides each float that is anchored under it until its exit completes,
 * such as a tooltip that a caller holds open. A float anchored in the overlay
 * stays on top of it. A click on the backdrop stops at the
 * backdrop, so the React ancestors of the overlay do not receive it.
 *
 * A closed overlay is `inert` for its exit animation, so it takes no press and
 * no key. The body stays locked until the exit completes. A modal overlay
 * seals the page only while it is open, so the page is in the accessibility
 * tree for the exit. The focus goes to `<body>` when the overlay closes, and a
 * modal overlay returns it to the trigger at unmount.
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
	returnFocusTo,
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

	const setPanel = useComposedRefs<HTMLDivElement>(setFloating, containerRef, ref)

	useDismissable({
		open,
		onDismiss: () => onOpenChange(false),
		// A modal overlay owns outside-press dismissal through a click on the
		// backdrop, or on its root when no backdrop renders. A non-modal overlay
		// blocks nothing, so an outside pointer press dismisses it directly.
		outsidePointer: !modal && dismissOnBackdrop,
		containerRef,
	})

	// Whether the overlay is on screen: open, or closed and in its exit. The
	// scroll lock holds until the exit completes. A release during the exit
	// changes the overflow of the body, so the browser lays out and paints the
	// page again under the exit animation. That paint can decode the images of
	// the page again, and the animation then drops frames.
	const [present, setPresent] = useState(open)

	if (open && !present) setPresent(true)

	useScrollLock(present && !scoped && modal)

	// A modal overlay moves the focus in itself, without a scroll of the page.
	// The focus manager thus takes no initial focus.
	useOverlayInitialFocus(modal ? floating : null, open, initialFocus)

	// A modal press outside the panel lands on the backdrop. With no paint, the
	// backdrop stays for that press alone.
	const catchesPress = modal && dismissOnBackdrop

	// Whether the current press started on the backdrop.
	const pressedRef = useRef(false)

	const backdropRef = useRef<HTMLDivElement>(null)

	// A box fixed to the viewport keeps clear of the on-screen keyboard.
	useOverlayViewportFit(floating, backdropRef, present && !scoped)

	useEffect(() => {
		if (!open) return

		// A press of an earlier open does not count for this one.
		pressedRef.current = false

		notifyOverlaySignal()
	}, [open])

	// An overlay that dims or seals its box covers the floats anchored in that
	// box. They hide until the exit completes and the node unmounts, so a float
	// does not paint over the panel while the panel leaves. A non-modal overlay
	// with no backdrop covers only the box of its panel, so it covers no float.
	const covering = modal || backdrop

	useLayoutEffect(() => {
		if (!floating || !covering) return

		return registerOverlayLayer({ node: floating, scope: container ?? null })
	}, [floating, covering, container])

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

	const slots = k({ scoped })

	const panel = (
		<div
			ref={setPanel}
			data-slot="overlay"
			{...props}
			// A press that ends off the backdrop sends the backdrop no click, so its flag must
			// not stay for a later click.
			onPointerUpCapture={(event) => {
				props.onPointerUpCapture?.(event)

				if (event.target !== backdropRef.current) pressedRef.current = false
			}}
			// On iOS, the on-screen keyboard makes the visual viewport smaller than the
			// page, and a touch pans the page under a modal overlay. The body lock does
			// not stop this pan. `touch-none` stops it. A scroll container in the panel
			// still scrolls, because the touch action of each element up to its scroll
			// container sets the gesture.
			className={cn(
				slots.base,
				!modal && 'pointer-events-none',
				modal && !scoped && 'touch-none',
				className,
			)}
		>
			{(backdrop || catchesPress) && (
				<m.div
					{...k.motion}
					ref={backdropRef}
					data-slot="overlay-backdrop"
					className={backdrop ? (backdropClassName ?? slots.backdrop) : 'absolute inset-0'}
					// React carries a click in the portal up the component tree, and each
					// panel stops its own clicks. The backdrop stops its clicks too. If it
					// did not, the press that dismisses a menu sheet would also click the
					// grid row that holds the menu.
					onPointerDown={() => {
						pressedRef.current = true
					}}
					onPointerCancel={() => {
						pressedRef.current = false
					}}
					onClick={(event) => {
						event.stopPropagation()

						const pressed = pressedRef.current

						pressedRef.current = false

						// A click closes only for a press that started on the backdrop. On
						// iOS, the tap that opens an overlay on its lift still sends its click
						// after the overlay is up, and that click lands on the backdrop. A
						// click from a script has no press (`detail` 0), so it closes.
						if (dismissOnBackdrop && (pressed || event.detail === 0)) onOpenChange(false)
					}}
					aria-hidden="true"
				/>
			)}
			{children}
		</div>
	)

	return (
		<Portal open={open} container={container} ssr onExitComplete={() => setPresent(false)}>
			{modal ? (
				<OverlayFocus container={container} context={context} returnFocusTo={returnFocusTo}>
					{panel}
				</OverlayFocus>
			) : (
				panel
			)}
		</Portal>
	)
}

/**
 * The elements of the page outside `box`: the siblings of `box` and of each of
 * its ancestors, up to `<body>`. A trap that counts them as part of the surface
 * seals only the content of `box`.
 *
 * @internal
 */
function outside(box: Element): Element[] {
	const elements: Element[] = []

	const body = box.ownerDocument.body

	for (let node = box; node !== body && node.parentElement; node = node.parentElement) {
		for (const sibling of node.parentElement.children) {
			if (sibling !== node) elements.push(sibling)
		}
	}

	return elements
}

/**
 * Wraps the overlay panel in a modal `FloatingFocusManager`, which traps focus
 * and seals the page while the overlay is open. `useOverlayInitialFocus` moves
 * the focus in on open, and `useOverlayReturnFocus` gives it back at unmount.
 * Only a modal overlay renders it. A non-modal surface renders bare: no trap,
 * no initial-focus steal, no focus return. Focus stays where it is.
 *
 * @internal
 */
function OverlayFocus({
	container,
	context,
	returnFocusTo,
	children,
}: {
	/** The box that the overlay covers, or none for the viewport. */
	container: HTMLElement | null | undefined
	context: FloatingRootContext
	returnFocusTo: RefObject<HTMLElement | null> | undefined
	children: ReactElement
}) {
	// An overlay fixed to the viewport seals the whole page. The focus guards
	// bounce a Tab at the edge of the panel back inside, and the page is
	// `aria-hidden`.
	//
	// An overlay in a container seals only the container. `getInsideElements`
	// gives the page outside the container to the trap as part of the surface,
	// so the trap does not mark it. Two halves of the trap then change. The
	// focus guards must not bounce a Tab back inside, so `guards={false}` removes
	// them. `outsideElementsInert` marks the covered content `inert`, not
	// `aria-hidden`. Thus the tab order skips that content with no guard, and a
	// press does not get to it. The tab order runs in DOM order out of the
	// panel, through the page, and back.
	//
	// `guards={false}` alone already forces the `inert` marking in 0.27. The
	// prop `outsideElementsInert` states the intent, because no version
	// promises to keep that side effect.
	const scoped = container != null

	// `AnimatePresence` holds the exiting subtree at the props of its last open
	// render, so the focus manager does not see the close. Without `disabled`,
	// it keeps the page `aria-hidden` through the exit, while the overlay is
	// `inert`. Assistive technology then finds no content at all. Disabled at
	// the close, the focus manager clears its marks, and the page is back in
	// the accessibility tree for the exit. A reopen during the exit enables
	// it again.
	//
	// The focus manager returns the focus when it is disabled, which is too
	// early (see `useOverlayReturnFocus`). Thus it gets no return focus.
	const present = useIsPresent()

	useOverlayReturnFocus(returnFocusTo)

	return (
		<FloatingFocusManager
			context={context}
			disabled={!present}
			modal
			initialFocus={-1}
			returnFocus={false}
			guards={!scoped}
			outsideElementsInert={scoped}
			getInsideElements={scoped ? () => outside(container) : undefined}
		>
			{children}
		</FloatingFocusManager>
	)
}
