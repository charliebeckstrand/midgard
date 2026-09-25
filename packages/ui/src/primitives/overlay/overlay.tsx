'use client'

import { type FloatingContext, FloatingFocusManager, useFloating } from '@floating-ui/react'
import { motion } from 'motion/react'
import {
	type ComponentProps,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
} from 'react'
import { cn, composeEventHandlers } from '../../core'
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
	/**
	 * Class for the dimming backdrop. It fully replaces the backdrop's default
	 * classes (including `absolute inset-0`), and applies only when a backdrop
	 * renders; with `backdrop={false}` it has no effect.
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
	 * `false` for transient, pointer-driven surfaces that must not steal focus or
	 * block the page. A hover-revealed sheet is the example. No backdrop renders
	 * unless `backdrop` is set. The page behind stays interactive, because the
	 * panel re-enables its own pointer events. Escape or a pointer press outside
	 * the panel dismisses.
	 */
	modal?: boolean
	/**
	 * Whether the backdrop plays its enter animation on mount.
	 *
	 * `false` mounts it already in place. For a surface that is open because the URL says
	 * so, the fade announces an opening the user never performed. A restored route or a
	 * pasted deep link is the case. On a route that remounts it replays on every arrival.
	 *
	 * It suppresses that arrival only. A surface that closes and opens again while still
	 * mounted plays the enter every time, whatever this says. By then the open is the
	 * user's own doing.
	 *
	 * @defaultValue true
	 */
	animateOnMount?: boolean
	/**
	 * Paint the dimming backdrop independently of modality. A non-modal surface,
	 * such as a hover-revealed sheet, can opt in to blur and dim the page while
	 * staying interactive. The backdrop inherits the wrapper's
	 * `pointer-events-none`, so it never intercepts a press.
	 *
	 * The flag changes paint only. A modal overlay with `backdrop={false}` still
	 * closes on a press outside the panel, unless `dismissOnBackdrop` is `false`.
	 *
	 * @defaultValue `modal`
	 */
	backdrop?: boolean
} & Omit<ComponentProps<'div'>, 'children'>

/**
 * Portalled backdrop-and-panel shell for modal surfaces (Dialog, Sheet,
 * Drawer). Manages focus trapping, body scroll lock, dismissal, and the
 * dimming backdrop; consumers render the panel as `children`.
 *
 * @remarks Client-only: returns `null` during SSR. Renders into the explicit
 * `container`, else the ambient `<UIProvider>` portal node, else
 * `document.body`. A `container` scopes the overlay to that element
 * (`absolute`, no scroll lock). For transient pointer-driven surfaces,
 * `modal={false}` drops focus management, scroll lock, and the backdrop (unless
 * `backdrop` is set). Any `PersistentChrome` region stays reachable through the
 * trap without modality being given up. Fires the overlay signal on open so
 * non-modal floats (tooltips) dismiss.
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
	animateOnMount = true,
	className,
	onClick,
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
		// A modal overlay owns outside-press dismissal through a click on the
		// backdrop, or on its root when no backdrop renders. A non-modal overlay
		// blocks nothing, so an outside pointer press dismisses it directly.
		outsidePointer: !modal && dismissOnBackdrop,
		containerRef,
	})

	useScrollLock(open && !scoped && modal)

	// With no backdrop, the root is what a modal press outside the panel lands on.
	// A press that bubbles up from the panel has another target, so it stays open.
	const dismissOnRoot = modal && !backdrop && dismissOnBackdrop

	useEffect(() => {
		if (open) notifyOverlaySignal()
	}, [open])

	const panel = (
		// biome-ignore lint/a11y/noStaticElementInteractions: the root stands in for the absent backdrop, a pointer target and not a control. Escape is the keyboard route.
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape through `useDismissable` is the keyboard route, as it is for the backdrop.
		<div
			ref={setPanel}
			data-slot="overlay"
			{...props}
			onClick={
				dismissOnRoot
					? composeEventHandlers(onClick, (event) => {
							if (event.target === event.currentTarget) onOpenChange(false)
						})
					: onClick
			}
			className={cn(
				k.root,
				scoped ? 'absolute' : 'fixed',
				!modal && 'pointer-events-none',
				className,
			)}
		>
			{backdrop && (
				<motion.div
					{...k.motion}
					// After the preset spread, so it overrides the preset's own `initial`.
					initial={animateEnter ? k.motion.initial : false}
					data-slot="overlay-backdrop"
					className={backdropClassName ?? cn('absolute inset-0', k.backdrop.base)}
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
