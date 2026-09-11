'use client'

import type { KeyboardEvent, MouseEvent, Ref } from 'react'
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '../../core'
import type { Color } from '../../core/recipe'
import { useA11yAnnouncements, useA11yRoving, useComposedRef } from '../../hooks'
import { k } from '../../recipes/kata/pdf-viewer'
import { isScrollbarPress } from '../../utilities'
import { usePdfViewerContext } from './context'
import { PdfViewerHighlightLabel } from './pdf-viewer-highlight-label'
import { usePdfViewerHighlightsContext } from './pdf-viewer-highlights-context'
import type { PdfViewerHighlightRect } from './types'
import { HIGHLIGHT_ID_ATTR, HIGHLIGHT_SELECTOR } from './use-pdf-viewer-highlights'

const layer = k.viewport.page.highlights

const region = layer.region

const regionClasses = new Map<string, string>()

/**
 * The region's classes for one `(color, active)` pair, computed once.
 *
 * @remarks `cn` memoises only when every argument is a string, and three of these four are
 * arrays (`shades()` returns `string[]`), so each call would otherwise run the full
 * clsx + tailwind-merge over ~14 tokens. There are five colours and two states, so ten
 * results cover every document; measured, this cuts ~142 µs per layer render at 40 regions
 * to ~4.5 µs, and the layer re-renders on every zoom step and every resize frame. The
 * `dimmed` axis doubles the table to twenty entries, which is still every combination a
 * document can produce.
 * @internal
 */
function regionClass(color: Color, active: boolean, dimmed: boolean) {
	const key = `${color}:${active}:${dimmed}`

	let classes = regionClasses.get(key)

	if (classes === undefined) {
		classes = cn(
			region.base,
			active ? region.activeFill[color] : region.fill[color],
			region.ring[color],
			// Selected or hoverable, never both: see the kata's `hover` note — a hover step on
			// the selected region outranks its own `ring-4` and flattens the selection.
			active ? region.active : region.hover,
			dimmed && region.dimmed,
		)

		regionClasses.set(key, classes)
	}

	return classes
}

/** Percentages of the layer, which is the page image's twin — so the browser rescales every region on a zoom change with no React work. @internal */
function regionStyle({ x, y, width, height }: PdfViewerHighlightRect) {
	return {
		left: `${x * 100}%`,
		top: `${y * 100}%`,
		width: `${width * 100}%`,
		height: `${height * 100}%`,
	}
}

/**
 * The region a pointer event landed in, or null for the layer's own background.
 *
 * @remarks One lookup for the whole layer's delegation — hover and press both need it, and
 * both need it to agree. Returns the element beside the id because the hover path anchors a
 * label to the node while the press path only names it.
 * @internal
 */
function regionAt(event: MouseEvent<HTMLDivElement>) {
	const element = (event.target as HTMLElement).closest<HTMLElement>(HIGHLIGHT_SELECTOR)

	const id = element?.getAttribute(HIGHLIGHT_ID_ATTR)

	return element && id ? { element, id } : null
}

/**
 * Whether a point is inside an element's box.
 *
 * @remarks A box with no size covers nothing — which is the honest answer before the first
 * layout, and the answer jsdom gives for everything. Both are cases where the name stands in
 * nothing's way.
 * @internal
 */
function within(element: HTMLElement | null, x: number, y: number) {
	if (!element) return false

	const box = element.getBoundingClientRect()

	if (box.width === 0 || box.height === 0) return false

	return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
}

/**
 * Gates the overlay and announces the active region.
 *
 * @remarks The layer is a separate component below, not an early return inside one,
 * because its effects have to run against a mounted container: the roving tab-stop owner
 * observes the region set, and on first paint — before the viewport has been measured —
 * there is nothing to observe. A component that mounts only once there is something to
 * draw gets a populated ref the first time its effects run.
 * @internal
 */
export function PdfViewerHighlights() {
	const { visible } = usePdfViewerContext()

	const { regions, interactive, activeLabel } = usePdfViewerHighlightsContext()

	// A visual box announces nothing on its own. The page change an activation may cause
	// already speaks through the viewport's own live region, so this says only the name —
	// and only when the regions are in the tree at all, since a decorative layer is
	// aria-hidden and an announcement would name something a reader cannot reach.
	useA11yAnnouncements(interactive && activeLabel ? `Highlighted region: ${activeLabel}` : null)

	if (!visible || regions.length === 0) return null

	return <PdfViewerHighlightLayer />
}

/**
 * Draws the active page's highlighted regions over the page image, inside the same frame
 * and under the same transform.
 *
 * @remarks Only the active page's regions are in the DOM: a long packet keeps one page's
 * worth of nodes and one page's worth of keyboard reachability, whatever the document's
 * total. One delegated press handler serves every region, so the layer allocates one
 * closure rather than one per region.
 *
 * A named region is a real `<button>`; a set with no names is decoration inside an
 * `aria-hidden` layer, because a box with no accessible name cannot be a control.
 * @internal
 */
function PdfViewerHighlightLayer() {
	const { scale, highlightsVisible, viewportRef } = usePdfViewerContext()

	const { regions, interactive, activeLabel, activate, press, clear, revealRef } =
		usePdfViewerHighlightsContext()

	const layerRef = useRef<HTMLDivElement>(null)

	/*
	 * The selected region's element, for the label that names it.
	 *
	 * State rather than a ref because the label is a sibling that needs it as a prop — the
	 * same shape `TooltipContent` uses for its own panel probe. It changes once per selection,
	 * which is a render the layer was doing anyway.
	 */
	const [anchor, setAnchor] = useState<HTMLElement | null>(null)

	// One tab stop for the whole layer, with arrows moving between regions — a dense page
	// carries 20-40 of them, and they mirror a list the consumer already renders beside
	// the viewer. `aria-current` marks which region holds the resting stop. Off in a
	// decorative layer: `manageTabIndex` would otherwise seat a tab stop on a span inside
	// an `aria-hidden` subtree.
	const handleRovingKeyDown = useA11yRoving(layerRef, {
		itemSelector: HIGHLIGHT_SELECTOR,
		enabled: interactive,
		orientation: 'vertical',
		manageTabIndex: true,
		activeSelector: '[aria-current="true"]',
	})

	const { imageWidth, imageHeight, transform } = scale

	/*
	 * Whether anything is selected at all. While something is, every other region drops its
	 * colour — one wash among twenty reads as a field of colour rather than as a selection.
	 *
	 * Read off `activeLabel`, which the provider already derives with the same scan: a label
	 * is required of every highlight, so a name in hand and a selected region are the same
	 * fact. One scan per layer render rather than two.
	 */
	const anyActive = activeLabel !== null

	// The active region is what the reveal scrolls to and what the label hangs off.
	const activeRegionRef = useComposedRef<HTMLElement>(revealRef, setAnchor)

	/*
	 * The region under the pointer, which names itself while it is there.
	 *
	 * A box cannot say what it is, and until now only the *selected* one said so — leaving a
	 * reader to press twenty regions to find the one they wanted, changing the selection, and
	 * whatever the consumer hangs off it, twenty times on the way.
	 *
	 * **A preview sits beside the selection rather than replacing it.** The two are different
	 * things to a reader — one is where they are working, the other is what they are checking —
	 * and the selection has a form field, a scroll position and whatever else the consumer hangs
	 * off it standing behind it. A pointer passing over a box should not quietly take the name
	 * off the box the reader came here for.
	 *
	 * The element is kept beside the id because the label anchors to a node, while the id is
	 * what says whether that node is still one of this page's regions — a page turned under the
	 * pointer would otherwise leave the panel floating against a detached box.
	 */
	const [hovered, setHovered] = useState<{
		id: string
		element: HTMLElement
		label: string
	} | null>(null)

	/*
	 * Whether the pointer is on it *now*, kept apart from which region it was on.
	 *
	 * Two pieces of state for what looks like one, because the panel has to outlive the
	 * pointer: clearing the region on the way out would take the panel with it and leave
	 * nothing to fade. So leaving closes it and the region stays — which is also what lets a
	 * reader come back to the same box without the name flickering through a remount.
	 */
	const [previewing, setPreviewing] = useState(false)

	/*
	 * The selected region's name, reached imperatively.
	 *
	 * Whether the name is being read through — and therefore whether it is faint — is the
	 * name's own state, and it is held there rather than here for the reason the name is a leaf
	 * at all (see {@link PdfViewerHighlightLabel}): a flip held here would re-render forty
	 * regions to change one class on a panel three fibers away, and would dirty the layer's
	 * layout just before the next pointer move reads a rect against it.
	 *
	 * A handle rather than a callback prop because the traffic runs the other way. The layer is
	 * what sees the pointer; the name is what knows where its own box is.
	 */
	const nameRef = useRef<PdfViewerActiveNameHandle | null>(null)

	/*
	 * The region the pointer last named, looked up rather than merely confirmed: whether it is
	 * still one of this page's is the same question as which one it is, and a page turned under
	 * a pointer that has not moved is what makes that a question at all.
	 *
	 * `active` then answers the other one for free. The selected region already names itself,
	 * so hovering it says nothing new — and would say it twice, in two panels a few pixels
	 * apart.
	 */
	const previewed = hovered && regions.find((r) => r.id === hovered.id)

	const previewOpen = highlightsVisible && previewing && !!previewed && !previewed.active

	/** One delegated handler for the whole layer, as the press below is — not one per region. */
	function handleRegionOver(event: MouseEvent<HTMLDivElement>) {
		const hit = regionAt(event)

		// The layer's own background is not a region: crossing it clears the preview rather than
		// leaving the last one named under a pointer that has left it.
		if (!hit) {
			setPreviewing(false)

			return
		}

		setPreviewing(true)

		if (hovered?.id === hit.id) return

		setHovered({
			id: hit.id,
			element: hit.element,
			label: regions.find((r) => r.id === hit.id)?.label ?? '',
		})
	}

	/**
	 * Whether the pointer has moved onto — or off — a box the name covers.
	 *
	 * @remarks Attached only while a name is drawn (see the handler bag below), so a viewer with
	 * nothing selected carries no `mousemove` listener at all. The two tests are ordered by
	 * cost: `regionAt` walks two or three nodes, and the box read behind it is a layout read
	 * that runs only where the pointer is over a region.
	 */
	function handleRegionMove(event: MouseEvent<HTMLDivElement>) {
		const name = nameRef.current

		if (!name) return

		name.setBehind(regionAt(event) !== null && name.covers(event.clientX, event.clientY))
	}

	// A press with nothing to report it to cannot change anything, so it is not a button.
	const Region = interactive ? 'button' : 'span'

	function report(id: string) {
		// Every press is reported, including one on the already-active region — that is the
		// signal a consumer needs to answer "the reader pointed at this again" (reveal its
		// row, put the caret in its field).
		press(id)

		// Selection, though, is a no-op when it would not change: activation is selection
		// among siblings, not a toggle. It also keeps a keyboard activation that arrives as
		// both a roving key and a native click from reporting the same change twice.
		if (regions.some((r) => r.id === id && r.active)) return

		activate(id)
	}

	/**
	 * A pointer press lands on mousedown, not on the click that would follow.
	 *
	 * Because a press that only reports on release is a press whose effect is withheld for as
	 * long as the button is held — and the selection it would make is *undone* in the
	 * meantime. The region is a real button, so the browser's own mousedown default focuses
	 * it, which blurs whatever the consumer had focused for the previously selected region;
	 * a consumer that clears its selection on blur (a field list beside the viewer does
	 * exactly that) then drops the highlight the moment the button goes down and only gets it
	 * back when it comes up. Held still, the page reads as having deselected itself.
	 *
	 * `preventDefault` is the other half: it keeps that focus shift from happening at all, so
	 * the caret the consumer places from `onHighlightPress` stays where it was put. Scoped to
	 * a press that actually landed in a region — the layer's background keeps every default
	 * it had.
	 */
	function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
		// Primary button only: a right press opens the context menu, and a middle one is the
		// browser's.
		if (event.button !== 0) return

		const hit = regionAt(event)

		if (!hit) return

		event.preventDefault()

		report(hit.id)
	}

	/**
	 * Keyboard activation only — `Enter` and `Space` on a focused region, which arrive as a
	 * synthesized click with no pointer behind them (`detail === 0`).
	 *
	 * A pointer's own click is ignored here rather than handled: {@link handleMouseDown} has
	 * already reported it, and reporting again would double every press.
	 */
	function handleClick(event: MouseEvent<HTMLDivElement>) {
		if (event.detail !== 0) return

		const hit = regionAt(event)

		if (!hit) return

		report(hit.id)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === 'Escape') {
			// While a region holds focus, Escape belongs to the selection. `preventDefault` is
			// what says so: `useEscapeLayer` — which every dismissable surface in the package
			// reads Escape through — ignores a press whose default is already prevented.
			// `stopPropagation` alone would not do it, because that listener sits on
			// `document`, the same node React's own root listener is attached to.
			event.preventDefault()

			event.stopPropagation()

			clear()

			return
		}

		handleRovingKeyDown(event)
	}

	/*
	 * A press that lands on no region puts the selection down.
	 *
	 * On the viewport rather than on the layer, because the reader's "somewhere else" is the
	 * whole page surface — the matte a fitted page sits in included — while the layer covers the
	 * page image alone. A native listener rather than a prop for the same reason: the viewport is
	 * rendered a component away, and reading the overlay's context there would re-render the page
	 * frame, the image and the lens on every activation, which is the cost the overlay's own
	 * provider exists to avoid.
	 *
	 * Registered only while there is a selection to put down, so a viewer at rest carries no
	 * listener — and not while the overlay is hidden, where the boxes are off screen and the
	 * selection is meant to survive a reader reading the page underneath.
	 */
	useEffect(() => {
		const viewport = viewportRef.current

		if (!interactive || !anyActive || !highlightsVisible || !viewport) return

		function handlePress(event: globalThis.MouseEvent) {
			// Primary button only, as the region press is: a right press opens the context menu.
			if (event.button !== 0) return

			const target = event.target as HTMLElement

			if (target.closest(HIGHLIGHT_SELECTOR)) return

			// The selected region's name is not somewhere else. It takes no pointer events, so a
			// press on it arrives here as a press on the page under it — and putting the selection
			// down would be the page answering a press on its own label.
			if (nameRef.current?.covers(event.clientX, event.clientY)) return

			// The scrollbar gutter is not the page either: a press there starts a pan.
			if (target === viewport && isScrollbarPress(event, viewport)) return

			clear()
		}

		viewport.addEventListener('mousedown', handlePress)

		return () => viewport.removeEventListener('mousedown', handlePress)
	}, [interactive, anyActive, highlightsVisible, viewportRef, clear])

	return (
		<div
			ref={layerRef}
			data-slot="pdf-viewer-highlights"
			className={cn(layer.layer, !interactive && layer.inert)}
			// Hidden, not unmounted: a reviewer reading the page under the boxes comes back
			// to the same selection.
			hidden={!highlightsVisible}
			style={{ width: imageWidth, height: imageHeight, transform }}
			{...(interactive
				? {
						role: 'group',
						'aria-label': 'Highlighted regions',
						onMouseDown: handleMouseDown,
						onClick: handleClick,
						onKeyDown: handleKeyDown,
						// Only where a region can be pressed. A decorative layer takes no pointer events
						// at all, so these would never fire there — but naming a box a reader cannot act
						// on promises something to do with it.
						onMouseOver: handleRegionOver,
						// Only while there is a name that could be in the way. Nothing else on this
						// layer answers a bare move, so with no selection React has no `mousemove`
						// listener to find and allocates no event for one.
						onMouseMove: anyActive ? handleRegionMove : undefined,
						onMouseLeave: () => {
							setPreviewing(false)

							nameRef.current?.setBehind(false)
						},
					}
				: { 'aria-hidden': true })}
		>
			{regions.map((r) => (
				<Region
					key={r.id}
					{...{ [HIGHLIGHT_ID_ATTR]: r.id }}
					{...(interactive && {
						type: 'button' as const,
						'aria-label': r.label,
						'aria-current': r.active || undefined,
					})}
					ref={r.active ? activeRegionRef : undefined}
					className={regionClass(r.color, r.active, anyActive && !r.active)}
					style={regionStyle(r.rect)}
				/>
			))}
			{/*
			 * Two names, because they are two states — the selection the reader is working from,
			 * and the box they are glancing at. One panel could only ever be one of those, and
			 * making it the hovered one meant the selected region lost its name every time a
			 * reader looked elsewhere.
			 *
			 * Both are inside the layer in the tree and outside it on screen: they portal, which
			 * is what keeps a name clear of the page's own `rotate()` and of the scrolling
			 * viewport that would otherwise clip it off the top of a zoomed page. Neither wraps
			 * its region, so moving the selection re-points an anchor rather than remounting the
			 * box, and the region keeps the focus the roving tab stop put on it.
			 *
			 * The selected one is unkeyed: it moves rarely, and repositioning in place is what it
			 * did before there was a preview at all.
			 */}
			<PdfViewerActiveName
				ref={nameRef}
				anchor={anchor}
				label={activeLabel}
				open={highlightsVisible}
			/>

			{/*
			 * The hovered one is keyed on its region, because floating-ui holds the reference it
			 * mounted with — so moving a name between boxes has to be a new panel, or the name
			 * changes while the box it points at does not. The region outlives the pointer (see
			 * `previewing`), so the key holds still through the fade out.
			 */}
			<PdfViewerHighlightLabel
				key={hovered?.id ?? 'none'}
				anchor={hovered?.element ?? null}
				label={hovered?.label ?? null}
				open={previewOpen}
			/>
		</div>
	)
}

/**
 * What the layer can ask of the selected region's name.
 *
 * @internal
 */
type PdfViewerActiveNameHandle = {
	/** Whether the name's own box covers a point, in client coordinates. */
	covers: (x: number, y: number) => boolean
	/** Tells the name the pointer is reading a box it covers, so it goes faint. */
	setBehind: (behind: boolean) => void
}

/**
 * The selected region's name, and whether the reader is looking through it.
 *
 * @remarks A component of its own, holding the one piece of state the layer would otherwise
 * hold for it. The name is a standing object over a layer of pressable boxes, and on a dense
 * page it lands on its neighbours; it takes no pointer events, so the hover and the press
 * reach the box beneath it either way, and this is the half the reader sees — the name going
 * faint over the box they are pointing at, which is the page saying the press will land there.
 *
 * Faintness flips as the pointer crosses the name's edge, which is the path a reader takes to
 * reach the box under it. Held in the layer, each flip re-rendered forty regions to change one
 * class on a panel three fibers away — and dirtied the layer's layout, so the next move's box
 * read paid a reflow instead of a cached rect. Here the same flip touches three fibers. It is
 * the rule {@link PdfViewerHighlightLabel} is a leaf for, applied one level up.
 *
 * The name never covers its own region: `offset(8)` holds it clear along the placement axis and
 * `shift` only moves it across, so a box under the name is always another one.
 * @internal
 */
function PdfViewerActiveName({
	anchor,
	label,
	open,
	ref,
}: {
	anchor: HTMLElement | null
	label: string | null
	open: boolean
	ref: Ref<PdfViewerActiveNameHandle>
}) {
	const [behind, setBehind] = useState(false)

	/*
	 * The chip around the text, which is the name as the reader sees it — the text does not
	 * reach the chip's padding, and the padding carries the same ground as the rest of it. The
	 * positioned wrapper outside it shrink-wraps the chip, so the two boxes are one; the chip is
	 * named here because it is the one that is drawn.
	 */
	const panelRef = useRef<HTMLElement | null>(null)

	const setNode = useCallback((node: HTMLElement | null) => {
		panelRef.current = node?.parentElement ?? null
	}, [])

	/*
	 * A name that moved covers nothing yet.
	 *
	 * Keyed on the anchor, which is the one fact that changes however the selection changed — a
	 * press, `Escape`, or a consumer driving `activeHighlightId` from a list beside the viewer.
	 * The layer used to clear this on the two paths it could see, and the third left the next
	 * name faint until the pointer moved again.
	 */
	const namedRef = useRef(anchor)

	if (namedRef.current !== anchor) {
		namedRef.current = anchor

		if (behind) setBehind(false)
	}

	useImperativeHandle(
		ref,
		() => ({
			covers: (x, y) => within(panelRef.current, x, y),
			setBehind,
		}),
		[],
	)

	return (
		<PdfViewerHighlightLabel
			ref={setNode}
			anchor={anchor}
			label={label}
			open={open}
			surfaceClassName={cn(layer.label.base, behind && layer.label.behind)}
		/>
	)
}
