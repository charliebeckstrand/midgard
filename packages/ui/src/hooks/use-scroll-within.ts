'use client'

/** Where a node should land within the scroller, per axis. Mirrors native `scrollIntoView`. */
type ScrollAlignment = 'start' | 'center' | 'end' | 'nearest'

type ScrollWithinOptions = {
	behavior?: ScrollBehavior
	/**
	 * Block-axis (vertical) alignment.
	 * @defaultValue 'nearest'
	 */
	block?: ScrollAlignment
	/**
	 * Inline-axis (horizontal) alignment. Omitted means the horizontal scroll position is
	 * left alone — which is every caller that only ever scrolls a list.
	 */
	inline?: ScrollAlignment
}

/** @internal */
function isScrollable(overflow: string) {
	return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

/** @internal */
function isClipping(overflow: string) {
	return overflow === 'hidden' || overflow === 'clip'
}

/**
 * Nearest scrollable ancestor that actually overflows on a requested axis. Stops at an
 * ancestor that clips a requested axis (`overflow: hidden`/`clip`): nothing outside it can
 * bring the node into view, so walking further would scroll an outer container the caller
 * never meant to touch (e.g. a short sidebar inside a clipped frame scrolling the whole
 * page on mount).
 *
 * @remarks Resolves ONE scroller. When a node's vertical and horizontal scrollers are
 * different ancestors, the nearer one wins and the other axis no-ops — the case this is
 * written for is a single container that overflows both ways.
 * @internal
 */
function findScrollAncestor(node: HTMLElement, wantsInline: boolean): HTMLElement | null {
	let scroller = node.parentElement

	while (scroller) {
		const { overflowX, overflowY } = getComputedStyle(scroller)

		// Require the ancestor to overflow, not merely declare a scroll style;
		// scrollTo no-ops on a non-overflowing wrapper.
		if (isScrollable(overflowY) && scroller.scrollHeight > scroller.clientHeight) return scroller

		if (wantsInline && isScrollable(overflowX) && scroller.scrollWidth > scroller.clientWidth)
			return scroller

		if (isClipping(overflowY) || (wantsInline && isClipping(overflowX))) return null

		scroller = scroller.parentElement
	}

	return null
}

/**
 * Scroll position that puts `offset` at `alignment` along one axis, or `undefined` when the
 * axis was not asked for, or when `'nearest'` finds the node already fully visible.
 *
 * @internal
 */
function resolveScrollOffset(
	alignment: ScrollAlignment | undefined,
	offset: number,
	nodeSize: number,
	viewportSize: number,
	currentScroll: number,
): number | undefined {
	if (!alignment) return undefined

	const slack = viewportSize - nodeSize

	switch (alignment) {
		case 'start':
			return currentScroll + offset
		case 'center':
			return currentScroll + offset - slack / 2
		case 'end':
			return currentScroll + offset - slack
		default:
			if (offset < 0) return currentScroll + offset

			if (offset + nodeSize > viewportSize) return currentScroll + offset - slack

			return undefined
	}
}

/** Scrolls `node` into view within its nearest overflowing ancestor per `block`/`inline`, leaving outer scrollers untouched. @internal */
function scrollWithin(node: HTMLElement | null, options: ScrollWithinOptions = {}) {
	if (!node) return

	const { behavior = 'auto', block = 'nearest', inline } = options

	const scroller = findScrollAncestor(node, inline !== undefined)

	if (!scroller) return

	const nodeRect = node.getBoundingClientRect()

	const scrollerRect = scroller.getBoundingClientRect()

	// scrollTop/clientHeight are padding-box metrics while the rect edges are
	// border-box; subtract the leading border so a bordered scroller doesn't
	// overstate the offset and over-scroll.
	const top = resolveScrollOffset(
		block,
		nodeRect.top - scrollerRect.top - scroller.clientTop,
		nodeRect.height,
		scroller.clientHeight,
		scroller.scrollTop,
	)

	const left = resolveScrollOffset(
		inline,
		nodeRect.left - scrollerRect.left - scroller.clientLeft,
		nodeRect.width,
		scroller.clientWidth,
		scroller.scrollLeft,
	)

	if (top === undefined && left === undefined) return

	// An axis that was not requested is `undefined`, and passing it is the same as omitting
	// it: `ScrollToOptions.top`/`left` are optional WebIDL members with no default, so an
	// undefined value is treated as absent and the algorithm keeps the current offset for
	// that axis. Verified in-browser — a horizontal reveal does not reset `scrollTop`.
	scroller.scrollTo({ top, left, behavior })
}

/**
 * Returns a function that scrolls a node into view within its nearest
 * scrollable ancestor, without affecting any outer scroll containers.
 * Mirrors the `block`/`inline`/`behavior` options of native `scrollIntoView`.
 *
 * @returns A stable `(node, { block?, inline?, behavior? }?) => void`. It walks up to
 * the first ancestor that overflows on a requested axis and stops at any clipping
 * (`overflow: hidden`/`clip`) boundary, so a node in a non-overflowing wrapper never
 * scrolls the page. `inline` is opt-in: omit it and the horizontal position is untouched.
 */
export function useScrollWithin() {
	return scrollWithin
}
