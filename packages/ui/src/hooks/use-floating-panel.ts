'use client'

import {
	autoUpdate,
	type ComputePositionConfig,
	type ComputePositionReturn,
	computePosition,
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
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { anchorFollowsTransforms, inTransformedSubtree } from '../utilities/anchor-transforms'
import { isCoveredByOverlay, subscribeOverlayLayers } from '../utilities/overlay-layers'
import { isUnderStickyBar } from '../utilities/sticky-cover'

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
	/**
	 * Places the panel again from the current reference. A caller whose virtual
	 * reference reads a value that changed calls it, because the reference keeps
	 * its identity and floating-ui sees no change.
	 */
	update: () => void
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

/** The `hide` middleware of floating-ui, which reads the clip of each scroll container. */
const clipHide = hide({ strategy: 'referenceHidden' })

/**
 * Marks the panel when its reference is out of view: scrolled out of a scroll
 * container, clipped by one, or under a sticky bar (see `isUnderStickyBar`). It
 * goes after each middleware that moves the panel, so it reads the final
 * position.
 * {@link useFloatingPanel} reads `referenceHidden` and hides the panel, which
 * comes back when the reference does. The panel stays open and keeps its state.
 *
 * @internal
 */
const hideMiddleware: Middleware = {
	name: clipHide.name,
	async fn(state) {
		const result = await clipHide.fn(state)

		if (result.data?.referenceHidden) return result

		const { reference } = state.elements

		const anchor = reference instanceof Element ? reference : reference.contextElement

		if (!anchor) return result

		return {
			...result,
			data: {
				...result.data,
				referenceHidden: isUnderStickyBar(anchor, reference.getBoundingClientRect()),
			},
		}
	},
}

/**
 * The position of the panel as an offset from its reference, in the
 * coordinates of the containing block of the panel. The offset is snapped to
 * 1/64 px, the layout unit of the browser, so a scroll does not change it.
 *
 * @internal
 */
type AnchorOffset = {
	/** The offset of the panel from the left edge of the reference. */
	x: number
	/** The offset of the panel from the top edge of the reference. */
	y: number
}

/** Snaps a length to 1/64 px. @internal */
const snap = (length: number) => Math.round(length * 64) / 64

/**
 * The custom properties on the panel that hold the edges of the reference that
 * floating-ui measured. They are the fallback of `anchor()` (see
 * {@link anchoredStyles}).
 *
 * @internal
 */
const FALLBACK_LEFT = '--floating-anchor-left'

const FALLBACK_TOP = '--floating-anchor-top'

/**
 * Whether `reference` is in a subtree that `position: fixed` takes out of the
 * scroll of the page. A fixed ancestor is a positioned ancestor, so the
 * `offsetParent` chain holds it.
 *
 * @internal
 */
function inFixedSubtree(reference: HTMLElement) {
	for (let node: Element | null = reference; node; ) {
		if (getComputedStyle(node).position === 'fixed') return true

		node = node instanceof HTMLElement ? node.offsetParent : null
	}

	return false
}

/**
 * Records the final position of the panel as an offset from its reference,
 * for the anchored styles of {@link useFloatingPanel}. It goes after each
 * other middleware, so it reads the final position. It also writes the edges
 * of the reference to the fallback properties of the panel, as `size` writes
 * its limits. Thus a position pass that renders nothing still writes them.
 *
 * It records no offset for a reference that is not an element. It also
 * records none for an `absolute` panel on a reference in a fixed subtree. The
 * browser does not move such a panel when the page scrolls, and resolves the
 * anchor at the position before the scroll. It records none for a reference
 * under a transform in an engine that resolves the anchor without the
 * transform (see `anchorFollowsTransforms`). A panel with no offset keeps the
 * `transform` position of floating-ui.
 *
 * @internal
 */
const anchorOffsetMiddleware: Middleware = {
	name: 'anchorOffset',
	fn({ x, y, rects, elements, strategy }) {
		const { reference, floating } = elements

		if (!(reference instanceof HTMLElement)) return {}

		if (strategy === 'absolute' && inFixedSubtree(reference)) return {}

		if (!anchorFollowsTransforms() && inTransformedSubtree(reference)) return {}

		const { x: left, y: top } = rects.reference

		floating.style.setProperty(FALLBACK_LEFT, `${left}px`)

		floating.style.setProperty(FALLBACK_TOP, `${top}px`)

		return { data: { x: snap(x - left), y: snap(y - top) } satisfies AnchorOffset }
	},
}

/**
 * What a position pass of an anchored panel shows: the placement, the offset,
 * and whether the reference is hidden. A scroll that the browser compensates
 * changes none of them. A pass that records no anchor offset gives
 * `undefined`, because the `transform` position changes at each pass.
 * The record of a middleware that gives no data is an empty object.
 *
 * @internal
 */
function anchoredView({ placement, middlewareData }: ComputePositionReturn) {
	const offset: Partial<AnchorOffset> | undefined = middlewareData.anchorOffset

	if (offset?.x === undefined || offset.y === undefined) return undefined

	return `${placement} ${offset.x} ${offset.y} ${middlewareData.hide?.referenceHidden ?? false}`
}

/**
 * Whether the browser supports CSS anchor positioning. The server and jsdom
 * have no `CSS.supports`, so they read `false`.
 *
 * @internal
 */
const anchorPositioning =
	typeof CSS !== 'undefined' &&
	typeof CSS.supports === 'function' &&
	CSS.supports('anchor-name: --a')

/**
 * A random part of each anchor name, one for each copy of this module. Two
 * copies of the package on one page then make no common names.
 *
 * @internal
 */
const ANCHOR_SCOPE = Math.random().toString(36).slice(2, 8)

/** The count of the anchor names that this module gave. @internal */
let anchorCount = 0

/**
 * Gives an anchor name that is unique in the document. An anchor name is
 * global to the document, but `useId` is unique only in one React root. Two
 * roots can therefore give the same id, and a panel of one root then anchors
 * to the reference of the other.
 *
 * @internal
 */
function nextAnchorName() {
	anchorCount += 1

	return `--floating-${ANCHOR_SCOPE}-${anchorCount}`
}

/**
 * Adds `name` to the inline `anchor-name` list of `element`, and returns the
 * function that removes it. A list keeps the name of each panel on a shared
 * reference, such as a menu trigger that also has a tooltip.
 *
 * @internal
 */
function addAnchorName(element: HTMLElement, name: string) {
	const read = () =>
		element.style
			.getPropertyValue('anchor-name')
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean)

	const write = (names: string[]) => {
		if (names.length > 0) element.style.setProperty('anchor-name', names.join(', '))
		else element.style.removeProperty('anchor-name')
	}

	write([...read().filter((entry) => entry !== name), name])

	return () => write(read().filter((entry) => entry !== name))
}

/**
 * The styles that place the panel against the CSS anchor of its reference.
 * When a scroll container between them scrolls, the browser moves the panel
 * with the reference in the same frame. This is also true when the scroll runs
 * off the main thread. A position that floating-ui writes as a `transform`
 * follows the scroll one frame late, after the `scroll` event, and the panel
 * shakes.
 *
 * The styles hold only the offset, so a scroll does not change them. The
 * fallback of `anchor()` is the edge of the reference that floating-ui
 * measured, which the middleware writes to the panel. A browser can refuse the
 * anchor, for example in a containing block that the panel cannot see. It then
 * puts the panel at the position of floating-ui.
 *
 * @internal
 */
function anchoredStyles(
	strategy: CSSProperties['position'],
	name: string,
	offset: AnchorOffset,
): CSSProperties {
	return {
		position: strategy,
		positionAnchor: name,
		left: `calc(anchor(left, var(${FALLBACK_LEFT})) + ${offset.x}px)`,
		top: `calc(anchor(top, var(${FALLBACK_TOP})) + ${offset.y}px)`,
	} as CSSProperties
}

/**
 * Keeps a panel on its reference while both are mounted: `autoUpdate` of
 * floating-ui, with a resize observer that pauses for the rest of each
 * delivery.
 *
 * @remarks `autoUpdate` places the panel again when the reference or the panel
 * resizes. It places the panel in the delivery of its observer, and a `size`
 * middleware then writes a size on the panel. The space that the panel has can
 * change in the same frame before the delivery, for example when a scroll
 * moves the reference. The write then resizes the panel again in the delivery
 * that reported its size. An observer that already got that delivery still
 * watches the panel: the observer of the panel, and the observer of a panel
 * that anchors to it. The browser then fires "ResizeObserver loop completed
 * with undelivered notifications" on `window`.
 *
 * Thus the observer of each panel stops after a delivery, and observes again in
 * the next frame, before the delivery of that frame, as
 * `observeResizeBeforePaint` does. A write in the rest of the delivery then
 * reaches no observer that already got the delivery. The new observation
 * reports the size that it finds, so no resize is lost. A report of the size
 * that the last delivery gave places nothing, so the observation does not
 * start again in each frame.
 *
 * The reference of a point, such as a context menu, observes the element that
 * holds the point.
 *
 * @internal
 */
function trackPanel(
	reference: ReferenceType,
	floating: HTMLElement,
	update: () => void,
	config: ComputePositionConfig,
) {
	// What the last pass that floating-ui placed shows.
	let shown: string | undefined

	// A pass of an anchored panel that shows the same as the last one places
	// nothing. The middleware still writes the fallback of the anchor.
	const place =
		anchorPositioning && reference instanceof HTMLElement
			? () => {
					void computePosition(reference, floating, config).then((next) => {
						const view = anchoredView(next)

						if (view !== undefined && view === shown) return

						shown = view

						update()
					})
				}
			: update

	const stop = autoUpdate(reference, floating, place, { elementResize: false })

	const anchor = reference instanceof Element ? reference : reference.contextElement

	const targets = anchor ? [anchor, floating] : [floating]

	// The size of each target at its last delivery.
	const sizes = new Map<Element, string>()

	let frame = 0

	const observe = () => {
		for (const target of targets) observer.observe(target)
	}

	const observer = new ResizeObserver((entries) => {
		let resized = false

		for (const { target, contentRect } of entries) {
			const size = `${contentRect.width}x${contentRect.height}`

			if (sizes.get(target) !== size) resized = true

			sizes.set(target, size)
		}

		if (!resized) return

		observer.disconnect()

		place()

		frame = requestAnimationFrame(observe)
	})

	observe()

	return () => {
		stop()

		cancelAnimationFrame(frame)

		observer.disconnect()
	}
}

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
	 * for a DOM-anchored panel whose reference moves independently. Its observer
	 * stops for the rest of each delivery, so the size that the middleware writes
	 * causes no "ResizeObserver loop" error. `'point'`
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
 * In a browser with CSS anchor positioning, a panel on an element reference
 * is placed against a CSS anchor on that element. The side and the shift
 * still come from floating-ui. The browser keeps the panel on the reference
 * while a scroll container between them scrolls. Thus the panel does not lag
 * the reference by a frame during a scroll. A position pass that shows the
 * same placement, offset, and hidden state renders nothing, so a scroll does
 * not render the panel. The panel writes the name of its anchor into the
 * inline `anchor-name` list of the reference while it is mounted. A virtual
 * reference keeps the `transform` position of floating-ui. So does an
 * `absolute` panel on a reference in a fixed subtree, and a browser without
 * anchor positioning. A reference under a transform keeps it too, in an
 * engine that resolves the anchor without the transform.
 *
 * Use this when you need to compose your own interaction hooks (hover, click,
 * clientPoint, etc.) against the returned `context`. For the common
 * dismiss+role pattern, prefer `useFloatingUI`.
 *
 * @returns `{ refs, floatingStyles, context, placement, isPositioned, update }`:
 * floating-ui's reference / floating refs, the positioning styles for the
 * floating element, the shared `FloatingRootContext` interaction hooks attach
 * to, the placement after `flip`, whether floating-ui placed the open panel,
 * and the call that places it again.
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
	// hide middleware goes after a caller chain too, so every panel hides while
	// its reference is out of view. The anchor offset goes last, so it reads the
	// final position.
	const resolvedMiddleware = useMemo(() => {
		const chain =
			middleware ?? buildMiddleware(offsetPx, matchReferenceWidth, fitHeight, horizontal)

		return [
			...(side ? [autoAlignMiddleware] : []),
			...chain,
			hideMiddleware,
			...(anchorPositioning ? [anchorOffsetMiddleware] : []),
		]
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

	const initialPlacement: Placement = side ? `${side}-start` : (placement as Placement)

	// The tracker runs the position passes of floating-ui with the same options.
	// A change of an option gives floating-ui a new `update`, which starts a new
	// tracker with the new options.
	const whileElementsMounted = useCallback(
		(trackedReference: ReferenceType, floating: HTMLElement, update: () => void) =>
			trackPanel(trackedReference, floating, update, {
				placement: initialPlacement,
				strategy: strategy ?? 'absolute',
				middleware: resolvedMiddleware,
			}),
		[initialPlacement, strategy, resolvedMiddleware],
	)

	const {
		refs,
		floatingStyles: transformStyles,
		context,
		middlewareData,
		placement: resolvedPlacement,
		strategy: resolvedStrategy,
		isPositioned,
		update,
	} = useFloating({
		placement: initialPlacement,
		open,
		onOpenChange: handleOpenChange,
		...(strategy ? { strategy } : {}),
		// Only when the caller anchors by element. Left off otherwise so
		// `refs.setReference` stays the reference for every ref-attached panel:
		// passing `elements: { reference: undefined }` would clear it.
		...(reference !== undefined ? { elements: { reference } } : {}),
		// A point-anchored surface (`track: 'point'`) repositions itself on every
		// coordinate change, so it skips the observer-based `autoUpdate` wiring.
		whileElementsMounted: track === 'point' ? undefined : whileElementsMounted,
		middleware: resolvedMiddleware,
	})

	const referenceHidden = middlewareData.hide?.referenceHidden ?? false

	// The CSS anchor of an element reference. A virtual reference, such as a
	// point, has no box to anchor to, and keeps the `transform` of floating-ui.
	const [anchorName] = useState(nextAnchorName)

	const { reference: anchorReference, floating: floatingElement } = context.elements

	const anchorElement =
		anchorPositioning && anchorReference instanceof HTMLElement ? anchorReference : null

	// The reference carries the name while the panel is mounted, so the anchor
	// is in place before the first position pass gives the anchored styles.
	useLayoutEffect(() => {
		if (!anchorElement || !floatingElement) return

		return addAnchorName(anchorElement, anchorName)
	}, [anchorElement, floatingElement, anchorName])

	// Empty when the middleware gave no offset.
	const anchorOffset: Partial<AnchorOffset> | undefined = middlewareData.anchorOffset

	const anchoredOffsetX = anchorOffset?.x

	const anchoredOffsetY = anchorOffset?.y

	// Keyed on the numbers of the offset, so a pass that places the panel at the
	// same offset keeps the identity of the styles.
	const anchored = useMemo(
		() =>
			anchorElement &&
			floatingElement &&
			anchoredOffsetX !== undefined &&
			anchoredOffsetY !== undefined
				? anchoredStyles(resolvedStrategy, anchorName, { x: anchoredOffsetX, y: anchoredOffsetY })
				: null,
		[
			anchorElement,
			floatingElement,
			anchoredOffsetX,
			anchoredOffsetY,
			resolvedStrategy,
			anchorName,
		],
	)

	const positionStyles = anchored ?? transformStyles

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

	return { refs, floatingStyles, context, placement: resolvedPlacement, isPositioned, update }
}
