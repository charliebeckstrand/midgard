'use client'

type ScrollWithinOptions = {
	behavior?: ScrollBehavior
	block?: 'start' | 'center' | 'end' | 'nearest'
}

function scrollWithin(node: HTMLElement | null, options: ScrollWithinOptions = {}) {
	if (!node) return

	const { behavior = 'auto', block = 'nearest' } = options

	let scroller: HTMLElement | null = node.parentElement

	while (scroller) {
		const { overflowY } = getComputedStyle(scroller)

		const scrollable = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'

		// Require the ancestor to overflow, not merely declare a scroll style;
		// scrollTo no-ops on a non-overflowing wrapper.
		if (scrollable && scroller.scrollHeight > scroller.clientHeight) break

		// A clipping ancestor (overflow: hidden/clip) bounds the node's scroll
		// context: nothing outside it can bring the node into view, so stop here
		// rather than walk up and scroll an outer page container the caller never
		// meant to touch. Without this, a nav item whose own scroller doesn't
		// overflow (e.g. a short sidebar inside a clipped frame) scrolls the
		// whole page on mount.
		if (overflowY === 'hidden' || overflowY === 'clip') return

		scroller = scroller.parentElement
	}

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
