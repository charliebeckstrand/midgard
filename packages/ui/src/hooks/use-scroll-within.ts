'use client'

import { getScroller } from '../utilities/get-scroller'

/** Where a node must land within the scroller, per axis. Mirrors native `scrollIntoView`. */
type ScrollAlignment = 'start' | 'center' | 'end' | 'nearest'

/** Options for {@link useScrollWithin}: the scroll container and the behavior a scroll into view takes. */
export type ScrollWithinOptions = {
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

/**
 * Scroll position that puts `offset` at `alignment` along one axis. The result is
 * `undefined` when the axis was not asked for, or when `'nearest'` finds the node already
 * fully visible.
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

/**
 * Scrolls `node` into view within `scroller` per `block`/`inline`. An axis left out keeps its
 * scroll position. Use it when the caller already owns the scroller. An ancestor walk could
 * reach past it and scroll an outer container.
 *
 * @internal
 */
export function scrollNodeWithin(
	scroller: HTMLElement,
	node: HTMLElement,
	options: ScrollWithinOptions,
) {
	const { behavior = 'auto', block, inline } = options

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
 * Scrolls `node` into view within its nearest overflowing ancestor per `block`/`inline`,
 * leaving outer scrollers untouched. The function that {@link useScrollWithin} gives, for a
 * caller that is not a component or a hook.
 *
 * @internal
 */
export function scrollWithin(node: HTMLElement | null, options: ScrollWithinOptions = {}) {
	if (!node) return

	const { block = 'nearest', inline } = options

	// The scroller must overflow now: scrollTo no-ops on a wrapper that does not.
	// An ancestor that clips a requested axis ends the walk, because a further
	// walk would scroll an outer container that the caller never meant to touch.
	// One scroller serves both axes, so when the vertical and horizontal
	// scrollers are different ancestors, the nearer one wins.
	const scroller = getScroller(node.parentElement, {
		inline: inline !== undefined,
		overflowing: true,
		stopAtClip: true,
	})

	if (scroller) scrollNodeWithin(scroller, node, { ...options, block })
}

/**
 * Returns a function that scrolls a node into view within its nearest
 * scrollable ancestor, without affecting any outer scroll containers.
 * Mirrors the `block`/`inline`/`behavior` options of native `scrollIntoView`.
 *
 * @returns A stable `(node, { block?, inline?, behavior? }?) => void`. It walks up to
 * the first ancestor that overflows on a requested axis, and stops at any clipping
 * (`overflow: hidden`/`clip`) boundary. A node in a non-overflowing wrapper therefore
 * never scrolls the page. `inline` is opt-in: omit it and the horizontal position is
 * untouched.
 */
export function useScrollWithin() {
	return scrollWithin
}
