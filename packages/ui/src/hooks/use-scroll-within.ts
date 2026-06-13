'use client'

type ScrollWithinOptions = {
	behavior?: ScrollBehavior
	block?: 'start' | 'center' | 'end' | 'nearest'
}

/**
 * Nearest scrollable ancestor that actually overflows. Stops at a clipping
 * ancestor (`overflow: hidden`/`clip`): nothing outside it can bring the node
 * into view, so walking further would scroll an outer container the caller
 * never meant to touch (e.g. a short sidebar inside a clipped frame scrolling
 * the whole page on mount).
 *
 * @internal
 */
function findScrollAncestor(node: HTMLElement): HTMLElement | null {
	let scroller = node.parentElement

	while (scroller) {
		const { overflowY } = getComputedStyle(scroller)

		const scrollable = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'

		// Require the ancestor to overflow, not merely declare a scroll style;
		// scrollTo no-ops on a non-overflowing wrapper.
		if (scrollable && scroller.scrollHeight > scroller.clientHeight) return scroller

		if (overflowY === 'hidden' || overflowY === 'clip') return null

		scroller = scroller.parentElement
	}

	return null
}

/** Scrolls `node` into view within its nearest overflowing ancestor per `block`, leaving outer scrollers untouched. @internal */
function scrollWithin(node: HTMLElement | null, options: ScrollWithinOptions = {}) {
	if (!node) return

	const { behavior = 'auto', block = 'nearest' } = options

	const scroller = findScrollAncestor(node)

	if (!scroller) return

	const nodeRect = node.getBoundingClientRect()

	const scrollerRect = scroller.getBoundingClientRect()

	// scrollTop/clientHeight are padding-box metrics while the rect top is
	// border-box; subtract the top border so a bordered scroller doesn't
	// overstate the offset and over-scroll.
	const offset = nodeRect.top - scrollerRect.top - scroller.clientTop

	const slack = scroller.clientHeight - nodeRect.height

	let top: number

	switch (block) {
		case 'start':
			top = scroller.scrollTop + offset
			break
		case 'center':
			top = scroller.scrollTop + offset - slack / 2
			break
		case 'end':
			top = scroller.scrollTop + offset - slack
			break
		default:
			if (offset < 0) top = scroller.scrollTop + offset
			else if (offset + nodeRect.height > scroller.clientHeight)
				top = scroller.scrollTop + offset - slack
			else return
	}

	scroller.scrollTo({ top, behavior })
}

/**
 * Returns a function that scrolls a node into view within its nearest
 * scrollable ancestor, without affecting any outer scroll containers.
 * Mirrors the `block`/`behavior` options of native `scrollIntoView`.
 *
 * @returns A stable `(node, { block?, behavior? }?) => void`. It walks up to
 * the first overflowing ancestor and stops at any clipping (`overflow:
 * hidden`/`clip`) boundary, so a node in a non-overflowing wrapper never
 * scrolls the page.
 */
export function useScrollWithin() {
	return scrollWithin
}
