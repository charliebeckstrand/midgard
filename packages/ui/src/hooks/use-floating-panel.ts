'use client'

import {
	autoUpdate,
	type ExtendedRefs,
	type FloatingRootContext,
	flip,
	hide,
	type Middleware,
	type OpenChangeReason,
	offset,
	type Placement,
	type ReferenceType,
	type Side,
	shift,
	size,
	useFloating,
} from '@floating-ui/react'
import {
	type CSSProperties,
	type RefObject,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from 'react'
import { isCoveredByOverlay, subscribeOverlayLayers } from '../utilities/overlay-layers'

/**
 * Explicit return shape for {@link useFloatingPanel}.
 *
 * @remarks `useFloating`'s inferred shape references `@floating-ui/react-dom`,
 * a transitive dep TS cannot express in a portable `.d.ts` (TS2742); declaring
 * it locally avoids the error.
 */
export type FloatingPanelResult = {
	refs: ExtendedRefs<ReferenceType>
	floatingStyles: CSSProperties
	context: FloatingRootContext
	/** The placement after the middleware ran: the side that `flip` selected, and the alignment. */
	placement: Placement
	/**
	 * Whether floating-ui placed the open panel. Until then the panel is at the
	 * origin of its containing block. It goes back to `false` when the panel
	 * closes.
	 */
	isPositioned: boolean
}

/**
 * Placement of a floating panel. It is a floating-ui `Placement`, or a side with
 * the `auto` alignment. The `auto` alignment follows the reference. When the
 * center of the reference is in the first half of the viewport, the panel aligns
 * to the start edge. In the second half, it aligns to the end edge. The check
 * occurs at each reposition, so the alignment follows a layout that moves the
 * reference to the other side.
 */
export type FloatingPlacement = Placement | `${Side}-auto`

/** The side of an `auto` placement, or `undefined` for a floating-ui placement. @internal */
function autoSide(placement: FloatingPlacement): Side | undefined {
	return placement.endsWith('-auto') ? (placement.slice(0, -'-auto'.length) as Side) : undefined
}

/**
 * Sets the alignment of the current placement from the position of the
 * reference in the viewport. It acts one time for each side in a position
 * pass, and reads the side from the current placement. When `flip` moves the
 * panel to a new side, the middleware sets the alignment of that side again.
 * `flip` builds its fallbacks from the initial `-start` placement, so without
 * this a flipped panel keeps the start alignment. A later `flip` inside one
 * side keeps the placement that it selects, and causes no reset loop.
 *
 * @internal
 */
const autoAlignMiddleware: Middleware = {
	name: 'autoAlign',
	async fn({ placement, elements, platform, middlewareData }) {
		const [side] = placement.split('-') as [Side]

		const aligned: Partial<Record<Side, true>> | undefined = middlewareData.autoAlign

		if (aligned?.[side]) return {}
		const vertical = side === 'top' || side === 'bottom'
		const rect = elements.reference.getBoundingClientRect()
		const viewport = elements.floating.ownerDocument.documentElement

		const firstHalf = vertical
			? rect.left + rect.width / 2 < viewport.clientWidth / 2
			: rect.top + rect.height / 2 < viewport.clientHeight / 2

		// In a right-to-left context, floating-ui puts the `start` edge of a top or
		// bottom placement on the right.
		const rtl = vertical && Boolean(await platform.isRTL?.(elements.floating))

		const next: Placement = `${side}-${firstHalf !== rtl ? 'start' : 'end'}`

		const data = { [side]: true }

		return next === placement ? { data } : { data, reset: { placement: next } }
	},
}

/**
 * Marks the panel when its reference is out of view: scrolled out of a scroll
 * container, or clipped by one. It goes last, so it reads the final position.
 * {@link useFloatingPanel} reads `referenceHidden` and hides the panel, which
 * comes back when the reference does. The panel stays open and keeps its state.
 *
 * @internal
 */
const hideMiddleware = hide({ strategy: 'referenceHidden' })

/**
 * Lowers the height that is available to a floating panel to a height that
 * suits its content. It gets the available height and the floating element,
 * and returns the max-height to write. A larger value has no effect. A menu
 * uses it to cut its last visible row at the middle.
 */
export type FloatingHeightSnap = (availableHeight: number, floating: HTMLElement) => number

/** Options for {@link fitMiddleware}. @internal */
type FitOptions = {
	/** Set the min-width of the floating element to the reference width. */
	matchReferenceWidth?: boolean
	/** Cap the max-height of the floating element, and lower the cap with a snap function. */
	fitHeight?: boolean | FloatingHeightSnap
}

/**
 * Fits the floating element to the space that is available to it, with one
 * `size` middleware. Each `size` middleware measures the overflow again, and a
 * change of the panel size starts the chain again, so the chain holds one.
 *
 * The max-width is the available width, less an 8px margin to each viewport
 * edge. On a top or a bottom side, `shift` moves the panel along the edge, so
 * the available width is the viewport width. On a left or a right side, it is
 * the space on that side. The panel must let its content shrink with the
 * wrapper.
 *
 * With `matchReferenceWidth`, the min-width is the reference width.
 *
 * With `fitHeight`, the max-height is the height that is available on the side
 * of the reference, less an 8px margin to the viewport edge. When the panel
 * fits on no side, `flip` selects the side with the most space, and the panel
 * shrinks into that space. The panel must let its scroll region shrink with the
 * wrapper, as `Menu` does. A {@link FloatingHeightSnap} function can lower the
 * height, for example to a row boundary. The snap function reads the panel
 * after the width is set.
 *
 * It goes after `flip` and `shift`. Then a panel that is larger than the
 * viewport stays inside the margin that `shift` keeps.
 *
 * @internal
 */
export function fitMiddleware({
	matchReferenceWidth = false,
	fitHeight = false,
}: FitOptions = {}): Middleware {
	const snap = typeof fitHeight === 'function' ? fitHeight : undefined

	return size({
		padding: 8,
		apply({ availableWidth, availableHeight, rects, elements }) {
			const { style } = elements.floating

			style.maxWidth = `${Math.max(0, availableWidth)}px`

			if (matchReferenceWidth) style.minWidth = `${rects.reference.width}px`

			if (!fitHeight) return

			const available = Math.max(0, availableHeight)

			const height = snap ? Math.min(available, snap(available, elements.floating)) : available

			style.maxHeight = `${Math.max(0, height)}px`
		},
	})
}

/**
 * Default middleware chain: offset / flip / shift, then the fit middleware,
 * which caps the width and adds the sizes that the options request.
 *
 * A panel on the left or the right side can fit on neither side, for example
 * a wide panel on a phone. Then `flip` also tries the bottom and the top
 * sides, and `shift` keeps the panel inside the viewport on that side. Without
 * these fallbacks, `flip` selects the better of the two horizontal sides, and
 * the panel goes off the screen. A panel on the top or the bottom side keeps
 * its two vertical sides only, because `fitHeight` shrinks a tall panel into
 * the space on one of them.
 *
 * @internal
 */
function buildMiddleware(
	offsetPx: number,
	matchReferenceWidth: boolean,
	fitHeight: boolean | FloatingHeightSnap,
	horizontal: boolean,
): Middleware[] {
	return [
		offset(offsetPx),
		flip(horizontal ? { fallbackAxisSideDirection: 'end' } : undefined),
		shift({ padding: 8 }),
		fitMiddleware({ matchReferenceWidth, fitHeight }),
	]
}

/** Options for {@link useFloatingPanel}: placement, offset, and the middleware the surface positions through. */
export type FloatingPanelOptions = {
	/** Side and alignment of the panel. A `<side>-auto` value aligns the panel to the edge that is nearer to the reference (see {@link FloatingPlacement}). */
	placement: FloatingPlacement
	open: boolean
	/**
	 * Notified on every floating-ui-routed open-state change. Optional: a
	 * point-anchored surface composes only `useClientPoint`, whose position
	 * updates never call `onOpenChange`, so it has nothing to hand back.
	 *
	 * @remarks Pass a fresh closure each render if that is convenient. The call
	 * always reaches the latest render's callback, and the identity is read by
	 * nothing, so memoizing it buys no stability that matters here.
	 */
	onOpenChange?: (open: boolean, event?: Event, reason?: OpenChangeReason) => void
	/** Offset (px) between reference and floating element. @defaultValue 4 */
	offset?: number
	/** When true, sets the floating element's min-width to the reference width. @defaultValue false */
	matchReferenceWidth?: boolean
	/**
	 * When true, caps the max-height of the floating element to the space on its
	 * side of the reference. Then a panel that is taller than the viewport stays
	 * on screen, and its content must scroll. The cap is on the positioned
	 * wrapper, so the panel inside must shrink with it.
	 * A {@link FloatingHeightSnap} function turns the cap on and can lower it.
	 * @defaultValue false
	 */
	fitHeight?: boolean | FloatingHeightSnap
	/** Escape hatch: fully overrides the default offset/flip/shift/size middleware chain. `matchReferenceWidth` and `fitHeight` then do nothing. The panel still hides while its reference is out of view. */
	middleware?: Middleware[]
	/**
	 * Reposition strategy while mounted. `'auto'` wires `autoUpdate`
	 * (ResizeObserver plus ancestor scroll/resize listeners), the right default
	 * for a DOM-anchored panel whose reference moves independently. `'point'`
	 * drops `whileElementsMounted`. A pointer-anchored surface reseats its
	 * virtual reference on every coordinate change, which already triggers a
	 * reposition. The observer wiring is therefore redundant per-open cost.
	 * @defaultValue 'auto'
	 */
	track?: 'auto' | 'point'
	/**
	 * CSS positioning strategy for the floating element. `'fixed'` resolves the
	 * panel against the viewport instead of the portal's offset parent. That is
	 * what a surface anchored to viewport coordinates needs. An `'absolute'`
	 * panel lands short by however far any scroll container between them has
	 * scrolled.
	 * @defaultValue 'absolute'
	 */
	strategy?: 'absolute' | 'fixed'
	/**
	 * Reference element to anchor to, for a panel whose anchor the caller already
	 * holds rather than attaches a ref to. Handed straight to floating-ui's
	 * `elements`, so it supersedes `refs.setReference` and needs no ref plumbing
	 * of its own. That is what lets the panel live in a leaf beside the anchor,
	 * instead of in the component that renders it. `null` while there is nothing
	 * to anchor to; the panel is closed then anyway.
	 */
	reference?: HTMLElement | null
	/**
	 * When the panel transitions from open to closed, return focus to this
	 * element. A non-focusable wrapper hands focus to its first
	 * `button`/`[tabindex]` descendant instead. An `'outside-press'` close skips
	 * the restore, because focus follows the pointer. So does a `'focus-out'`
	 * close: Tab already carried focus to the next tabbable, and snapping back
	 * would undo it. Focus already inside the element also skips it. There is
	 * nothing to restore, and snapping to the descendant would yank a caret
	 * (Escape while typing in an input-mode DatePicker's DateInput).
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * Base hook for floating panels: wires `useFloating` with `autoUpdate` and a
 * standardized middleware chain: offset, flip, shift, size, and hide. A panel on
 * the left or the right side that fits on neither side moves to the bottom or
 * the top side. A panel that is wider than the viewport caps its width 8px
 * inside each edge. A panel whose reference is out of view, for example
 * scrolled out of a scroll container, is hidden until the reference comes back.
 * A panel whose reference is under an open overlay, for example a page under a
 * Sheet, is hidden until the overlay is gone. A panel whose reference is in
 * the overlay, or in a surface opened from it, stays on top of it.
 *
 * Use this when you need to compose your own interaction hooks (hover, click,
 * clientPoint, etc.) against the returned `context`. For the common
 * dismiss+role pattern, prefer `useFloatingUI`.
 *
 * @returns `{ refs, floatingStyles, context, placement, isPositioned }`:
 * floating-ui's reference / floating refs, the positioning styles for the
 * floating element, the shared `FloatingRootContext` interaction hooks attach
 * to, the placement after `flip`, and whether floating-ui placed the open panel.
 */
export function useFloatingPanel({
	placement,
	open,
	onOpenChange,
	offset: offsetPx = 4,
	matchReferenceWidth = false,
	fitHeight = false,
	middleware,
	returnFocusTo,
	track = 'auto',
	strategy,
	reference,
}: FloatingPanelOptions): FloatingPanelResult {
	const side = autoSide(placement)

	const horizontal = placement.startsWith('left') || placement.startsWith('right')

	// An `auto` placement starts at the start alignment. The alignment middleware
	// goes first, so `flip` and `shift` act on the alignment that it selects. The
	// hide middleware goes last, after a caller chain too, so every panel hides
	// while its reference is out of view.
	const resolvedMiddleware = useMemo(() => {
		const chain =
			middleware ?? buildMiddleware(offsetPx, matchReferenceWidth, fitHeight, horizontal)

		return [...(side ? [autoAlignMiddleware] : []), ...chain, hideMiddleware]
	}, [middleware, offsetPx, matchReferenceWidth, fitHeight, horizontal, side])

	// Reason of the pending close request; the focus-return effect reads it.
	// Every close that flows through floating-ui's `context.onOpenChange`
	// (interaction hooks, `FloatingFocusManager`, `useFloatingUI`'s dismiss
	// listeners) records one; programmatic closes carry none. A record lives to
	// the end of its task, as a refused set does in `useControllable`: an
	// accepted close commits in that task, and a refused one commits nothing, so
	// its reason must not reach a later close.
	const closeReasonRef = useRef<{ reason: OpenChangeReason | undefined } | undefined>(undefined)

	// A plain closure, deliberately unmemoized. `useFloating` re-wraps whatever
	// it is handed in an effect event of its own and reads the option nowhere
	// else, so a fresh identity per render reaches no dependency array and the
	// newest closure is the one it calls. Neither a ref shadow nor a stable
	// identity buys anything here.
	const handleOpenChange = (nextOpen: boolean, event?: Event, reason?: OpenChangeReason) => {
		if (nextOpen) {
			onOpenChange?.(nextOpen, event, reason)

			return
		}

		const record = { reason }

		closeReasonRef.current = record

		onOpenChange?.(nextOpen, event, reason)

		// Queued after the owner sets state, so the commit of an accepted close
		// runs first. A later request in the same task keeps its own record.
		queueMicrotask(() => {
			if (closeReasonRef.current === record) closeReasonRef.current = undefined
		})
	}

	const {
		refs,
		floatingStyles: positionStyles,
		context,
		middlewareData,
		placement: resolvedPlacement,
		isPositioned,
	} = useFloating({
		placement: side ? `${side}-start` : (placement as Placement),
		open,
		onOpenChange: handleOpenChange,
		...(strategy ? { strategy } : {}),
		// Only when the caller anchors by element. Left off otherwise so
		// `refs.setReference` stays the reference for every ref-attached panel:
		// passing `elements: { reference: undefined }` would clear it.
		...(reference !== undefined ? { elements: { reference } } : {}),
		// A point-anchored surface (`track: 'point'`) repositions itself on every
		// coordinate change, so it skips the observer-based `autoUpdate` wiring.
		whileElementsMounted: track === 'point' ? undefined : autoUpdate,
		middleware: resolvedMiddleware,
	})

	const referenceHidden = middlewareData.hide?.referenceHidden ?? false

	// The panel paints on the `float` rung, above each overlay. An open overlay
	// above the reference, such as a Sheet opened over the page that holds it,
	// therefore hides the panel, as a scroll hides it. A panel at a point, such
	// as a context menu or a pinned chart readout, is anchored in the element
	// that holds the point.
	const { domReference, reference: positionReference } = context.elements

	const anchor =
		domReference ??
		(positionReference && 'contextElement' in positionReference
			? (positionReference.contextElement ?? null)
			: null)

	const covered = useSyncExternalStore(
		subscribeOverlayLayers,
		() => open && anchor != null && isCoveredByOverlay(anchor),
		() => false,
	)

	const hidden = referenceHidden || covered

	// A new object only when the hidden state is on, so the styles keep the
	// identity of floating-ui while the reference is in view.
	const floatingStyles = useMemo<CSSProperties>(
		() => (hidden ? { ...positionStyles, visibility: 'hidden' } : positionStyles),
		[positionStyles, hidden],
	)

	const prevOpenRef = useRef(open)

	useEffect(() => {
		// An outside press skips restoration (focus follows the pointer), as
		// does a focus-out (Tab moved focus to the next tabbable; APG select
		// closes and lets the keystroke proceed). Every other close (Escape,
		// selection, programmatic) restores it.
		const reason = closeReasonRef.current?.reason

		if (prevOpenRef.current && !open && reason !== 'outside-press' && reason !== 'focus-out') {
			const trigger = returnFocusTo?.current

			// Focus already within the trigger means there is nothing to restore;
			// retargeting its first button would yank focus from a typeable
			// reference mid-edit.
			if (trigger && !trigger.contains(document.activeElement))
				(trigger.querySelector<HTMLElement>('button, [tabindex]') ?? trigger).focus()
		}

		closeReasonRef.current = undefined

		prevOpenRef.current = open
	}, [open, returnFocusTo])

	return { refs, floatingStyles, context, placement: resolvedPlacement, isPositioned }
}
