'use client'

import { type RefCallback, useCallback } from 'react'
import type { ScrollOrientation } from '../types'
import { observeScrollExtent } from './observe-scroll-extent'

/** Tolerance for fractional scroll offsets on zoomed or high-DPI displays. */
const EDGE_EPSILON_PX = 1

/** Options for {@link useScrollOverflow}: the enable gate and the axis to watch. */
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
	/**
	 * The scroll axis to watch. `vertical` stamps `data-overflow-above` and
	 * `data-overflow-below`. `horizontal` stamps `data-overflow-start` and
	 * `data-overflow-end`, which follow the reading direction. `both` stamps
	 * all four.
	 *
	 * @defaultValue 'vertical'
	 */
	axis?: ScrollOrientation
}

/**
 * Stamps scroll-overflow state onto a scroll container. On the vertical axis,
 * the node carries `data-overflow-above` / `data-overflow-below` while content
 * extends past the respective edge. On the horizontal axis, it carries
 * `data-overflow-start` / `data-overflow-end`. The hook drops each attribute
 * when that edge is reached. Style the attributes to build scroll affordances
 * — edge fades, shadows, arrows — in CSS.
 *
 * @param options - The enable gate, for a container that cannot overflow in
 * one of its states, and the axis to watch.
 * @returns A callback ref to attach to the scroll container.
 *
 * @remarks
 * State updates on scroll, on resize of the node or its direct children, and
 * on child additions or removals. The default axis is vertical, so a caller
 * that sets no `axis` gets no horizontal attribute. The ref cleans up its
 * listeners and attributes on detach (React 19 ref cleanup).
 *
 * The horizontal edges are logical. The `start` edge is the edge where the
 * reading direction starts: the left edge in a left-to-right document, and the
 * right edge in a right-to-left document. A browser reports `scrollLeft` as
 * zero at the start, and as a negative value toward the end of a right-to-left
 * scroller. Thus the hook reads the magnitude of the offset.
 *
 * A flip of `enabled` or of `axis` swaps the ref identity, so React detaches
 * the node and attaches it again. The cleanup clears all the attributes, and
 * the attach that follows re-measures.
 *
 * @example
 * ```tsx
 * const scrollOverflowRef = useScrollOverflow()
 *
 * <div ref={scrollOverflowRef} className="overflow-y-auto data-overflow-below:...">
 * ```
 *
 * @example
 * ```tsx
 * const scrollOverflowRef = useScrollOverflow({ axis: 'horizontal' })
 *
 * <div ref={scrollOverflowRef} className="overflow-x-auto data-overflow-end:...">
 * ```
 */
export function useScrollOverflow(options: ScrollOverflowOptions = {}): RefCallback<HTMLElement> {
	const { enabled = true, axis = 'vertical' } = options

	return useCallback(
		(node: HTMLElement | null) => {
			if (!node || !enabled) return

			const vertical = axis !== 'horizontal'

			const horizontal = axis !== 'vertical'

			const update = () => {
				if (vertical) {
					const above = node.scrollTop > EDGE_EPSILON_PX

					const below = node.scrollTop + node.clientHeight < node.scrollHeight - EDGE_EPSILON_PX

					node.toggleAttribute('data-overflow-above', above)

					node.toggleAttribute('data-overflow-below', below)
				}

				if (horizontal) {
					// The magnitude serves both directions: a right-to-left scroller
					// reports a negative offset toward its end.
					const offset = Math.abs(node.scrollLeft)

					const start = offset > EDGE_EPSILON_PX

					const end = offset + node.clientWidth < node.scrollWidth - EDGE_EPSILON_PX

					node.toggleAttribute('data-overflow-start', start)

					node.toggleAttribute('data-overflow-end', end)
				}
			}

			update()

			node.addEventListener('scroll', update, { passive: true })

			const stopObserving = observeScrollExtent(node, update)

			return () => {
				node.removeEventListener('scroll', update)

				stopObserving()

				node.removeAttribute('data-overflow-above')

				node.removeAttribute('data-overflow-below')

				node.removeAttribute('data-overflow-start')

				node.removeAttribute('data-overflow-end')
			}
		},
		[enabled, axis],
	)
}
