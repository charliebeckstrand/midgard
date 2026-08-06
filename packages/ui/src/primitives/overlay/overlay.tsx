'use client'

import { FloatingFocusManager, useFloating } from '@floating-ui/react'
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
import { useDismissable } from '../../hooks/use-dismissable'
import { useEnterAnimation } from '../../hooks/use-enter-animation'
import { useScrollLock } from '../../hooks/use-scroll-lock'
import { k } from '../../recipes/kata/overlay'
import { PresencePortal } from '../portal'
import { notifyOverlaySignal } from './overlay-signal'

/**
 * One `reachable` target: a ref to the element, or a CSS selector that the
 * overlay matches against the document.
 */
export type OverlayReach = RefObject<HTMLElement | null> | string

/**
 * The stacking rung a {@link OverlayProps.reachable} declaration obliges its chrome
 * to occupy: above a sealing overlay, below every float and toast.
 *
 * Naming chrome `reachable` keeps it in the focus order, but the scrim still paints
 * over it unless the consumer lifts it — and the consumer must, since only they can
 * see whether an ancestor establishes a stacking context. Apply this class to the
 * declared region rather than hardcoding a `z-*`, and the rung moves when the
 * library's ladder does.
 *
 * @example
 * ```tsx
 * <header className={cn('sticky top-0', overlayReachLayer)} data-app-chrome>…</header>
 * <Drawer open={open} onOpenChange={setOpen} reachable="[data-app-chrome]">…</Drawer>
 * ```
 */
export const overlayReachLayer = k.chrome

/**
 * Props for {@link Overlay}: the `open` / `onOpenChange` pair, the `modal` and
 * `backdrop` behavior flags, and the optional portal `container`,
 * `initialFocus`, and `reachable` targets.
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
	/**
	 * DOM outside the panel that keeps its place in the focus order while modal.
	 *
	 * A modal surface seals the page behind it. That fits a transaction to
	 * complete. It does not fit a long-lived work surface inside persistent app
	 * chrome — a maximized drawer whose state lives in a tab's href — because the
	 * trap leaves the user no exit but to dismantle the surface. Name the chrome
	 * here. It then keeps its tab stop, its place in the accessibility tree, and
	 * its pointer events (WCAG 2.1.1 / 2.4.3), and the rest of the page stays
	 * sealed.
	 *
	 * Pass a ref, a CSS selector, or an array of both. A selector contributes
	 * every match in the document, so one selector covers a region with more than
	 * one root. Prefer a ref when the chrome is in reach. Use a selector when the
	 * chrome is app-level and the panel is a route far below it, which is the
	 * common case.
	 *
	 * @remarks Modality holds. Focus still moves into the panel on open and
	 * returns on close, the body stays scroll-locked, and the scrim still
	 * dismisses on a press. Only the enforcement changes: undeclared outside
	 * content becomes `inert` rather than `aria-hidden`, so it also loses its
	 * pointer events, and the tab order runs in DOM order out of the panel,
	 * through the declared region, and back — what a native `<dialog>` does.
	 * Declare every other outside region that must stay live, such as a toast
	 * viewport that holds only `role="alert"` toasts.
	 *
	 * The targets resolve once, at the moment the overlay marks the page. Chrome
	 * that mounts after that is not exempt, so this prop suits chrome that
	 * outlives the surface. A browser with no `inert` support keeps the strict
	 * trap; there, only the accessibility-tree and pointer exemptions apply.
	 *
	 * The consumer owns the stacking order — only they can see whether an ancestor
	 * of the chrome establishes a stacking context. Put the declared region on
	 * {@link overlayReachLayer}, or the scrim covers what this prop made reachable.
	 *
	 * @defaultValue undefined — the panel is fully modal
	 */
	reachable?: OverlayReach | readonly OverlayReach[]
	/**
	 * Paint above app chrome that outranks the overlay root, rather than under it.
	 *
	 * The inverse of {@link OverlayProps.reachable}, and the other half of the same
	 * decision. `reachable` is for chrome a *panel* must not seal off, which obliges the
	 * consumer to lift that chrome onto {@link overlayReachLayer}. Once it has, every
	 * overlay is under it — including the ones that are themselves that app's navigation,
	 * and which therefore have to cover it.
	 *
	 * Set it on a surface whose whole purpose is to sit over the application, such as a
	 * navigation sidebar revealed as a sheet. Leave it off for a surface the user is
	 * working *inside*, where lifted chrome is the way out.
	 *
	 * @remarks Stacking only — modality, focus and dismissal are untouched. Two elevated
	 * overlays land on one level and fall back to DOM order, so this is not a way to rank
	 * overlays against each other; it ranks an overlay against the chrome above the root.
	 * Floats and toasts stay above either way.
	 *
	 * @defaultValue false — the root's ordinary rung
	 */
	elevated?: boolean
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
 * `backdrop` is set), and `reachable` keeps named outside chrome in the focus
 * order without giving up modality. Fires the overlay signal on open so
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
	reachable,
	elevated = false,
	...props
}: OverlayProps) {
	const { refs, context } = useFloating({ open, onOpenChange })

	const animateEnter = useEnterAnimation(open, animateOnMount)

	// `PresencePortal` owns the teleport and the mount-while-open lifecycle. An
	// explicit `container` scopes the overlay to that element (`absolute`, no
	// scroll lock); modal positioning and scroll lock key off `scoped`.
	const scoped = container != null

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

	const panel = (
		<div
			ref={(node) => {
				refs.setFloating(node)

				containerRef.current = node
			}}
			data-slot="overlay"
			className={cn(
				k.root({ elevated }),
				scoped ? 'absolute' : 'fixed',
				!modal && 'pointer-events-none',
			)}
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
			<OverlayFocus
				modal={modal}
				context={context}
				initialFocus={initialFocus}
				reachable={reachable}
			>
				{panel}
			</OverlayFocus>
		</PresencePortal>
	)
}

/**
 * Resolves the targets to the live elements floating-ui must count as part of
 * the panel. A ref contributes its current node, a selector contributes every
 * match in the document, and absent nodes drop out.
 *
 * @internal
 */
function resolveReach(targets: readonly OverlayReach[]): Element[] {
	const elements: Element[] = []

	for (const target of targets) {
		if (typeof target === 'string') {
			elements.push(...document.querySelectorAll(target))
		} else if (target.current) {
			elements.push(target.current)
		}
	}

	return elements
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
	reachable,
	children,
}: {
	modal: boolean
	context: ReturnType<typeof useFloating>['context']
	initialFocus: RefObject<HTMLElement | null> | undefined
	reachable: OverlayReach | readonly OverlayReach[] | undefined
	children: ReactElement
}) {
	if (!modal) return children

	// One level of `flat` accepts the singular and the array form alike. An absent
	// declaration and an empty array both give `[]`, so a degenerate `reachable={[]}`
	// reads as no declaration rather than as a sealed page with no way out of it.
	const targets = [reachable ?? []].flat()

	// Two halves enforce the trap, and a declaration has to relax both. The focus
	// guards bounce a Tab that reaches the panel's edge back inside, so
	// `guards={false}` retires them, and `outsideElementsInert` then marks
	// undeclared outside content `inert` rather than `aria-hidden` — which is what
	// holds the tab order off the sealed page once no guard is left to do it.
	// `getInsideElements` exempts the declared region from that marking.
	const declared = targets.length > 0

	// `guards={false}` alone already forces the `inert` marking in 0.27, so this
	// states the intent through the prop that documents it rather than resting on
	// the other one's side effect, which no version promises to keep.
	return (
		<FloatingFocusManager
			context={context}
			modal
			initialFocus={initialFocus ?? undefined}
			guards={!declared}
			outsideElementsInert={declared}
			getInsideElements={() => resolveReach(targets)}
		>
			{children}
		</FloatingFocusManager>
	)
}
