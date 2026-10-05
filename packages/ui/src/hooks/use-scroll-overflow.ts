'use client'

import { type RefCallback, useCallback } from 'react'
import { observeScrollExtent } from './observe-scroll-extent'

/** Tolerance for fractional scroll offsets on zoomed or high-DPI displays. */
const EDGE_EPSILON_PX = 1

/** An overflow value that lets the user scroll the box. @internal */
const SCROLLABLE = /auto|scroll/

/**
 * Whether the vertical overflow value of `node` lets the user scroll it. The
 * hook asks only when the content extends past an edge, so a box that fits
 * reads no style.
 *
 * @internal
 */
function scrollsVertically(node: HTMLElement): boolean {
	return SCROLLABLE.test(getComputedStyle(node).overflowY)
}

/** Options for {@link useScrollOverflow}: the enable gate. */
export type ScrollOverflowOptions = {
	/**
	 * Whether the hook watches at all. When false the ref still attaches, and
	 * then does nothing: no layout read, no observer, no listener, no attribute.
	 *
	 * That serves a container that cannot overflow in one of its states. A
	 * scroller with no height constraint grows with its content, so neither
	 * attribute can ever change, and the watch is dead work. `Menu` gates on
	 * `capped`, the flag that emits its viewport's `max-h`, and on a floating
	 * panel, which the floating layer caps to the viewport.
	 *
	 * @defaultValue true
	 */
	enabled?: boolean
}

/**
 * Stamps vertical scroll-overflow state onto a scroll container. The node
 * carries `data-overflow-above` / `data-overflow-below` while content extends
 * past the respective edge. The hook drops each attribute when that edge is
 * reached. Style the attributes to build scroll affordances, such as edge
 * fades, shadows, and arrows, in CSS.
 *
 * @param options - The enable gate, for a container that cannot overflow in
 * one of its states.
 * @returns A callback ref to attach to the scroll container.
 *
 * @remarks
 * State updates on scroll, on resize of the node or its direct children, and
 * on child additions or removals. The ref cleans up its listeners and
 * attributes on detach (React 19 ref cleanup).
 *
 * The node shows overflow only while its vertical overflow value lets the user
 * scroll it. A parent can set a scroll container to `visible` and scroll the
 * content itself. The content then extends past the edge of the container, but
 * the container does not scroll, so it carries no attribute.
 *
 * The hook watches the vertical axis only. A box that scrolls on the inline
 * axis takes `omote.rail`, which draws its edge fade in CSS with no script.
 *
 * A flip of `enabled` swaps the ref identity, so React detaches the node and
 * attaches it again. The cleanup clears the attributes, and the attach that
 * follows re-measures.
 *
 * @example
 * ```tsx
 * const scrollOverflowRef = useScrollOverflow()
 *
 * <div ref={scrollOverflowRef} className="overflow-y-auto data-overflow-below:...">
 * ```
 */
export function useScrollOverflow(options: ScrollOverflowOptions = {}): RefCallback<HTMLElement> {
	const { enabled = true } = options

	return useCallback(
		(node: HTMLElement | null) => {
			if (!node || !enabled) return

			const update = () => {
				const above = node.scrollTop > EDGE_EPSILON_PX

				const below = node.scrollTop + node.clientHeight < node.scrollHeight - EDGE_EPSILON_PX

				const scrolls = (above || below) && scrollsVertically(node)

				node.toggleAttribute('data-overflow-above', scrolls && above)

				node.toggleAttribute('data-overflow-below', scrolls && below)
			}

			update()

			node.addEventListener('scroll', update, { passive: true })

			const stopObserving = observeScrollExtent(node, update)

			return () => {
				node.removeEventListener('scroll', update)

				stopObserving()

				node.removeAttribute('data-overflow-above')

				node.removeAttribute('data-overflow-below')
			}
		},
		[enabled],
	)
}
