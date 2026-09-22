'use client'

import { type RefCallback, useCallback } from 'react'

/** Tolerance for fractional scroll offsets on zoomed or high-DPI displays. */
const EDGE_EPSILON_PX = 1

/** Options for {@link useScrollOverflow}: the enable gate. */
export type ScrollOverflowOptions = {
	/**
	 * Whether the hook watches at all. When false the ref still attaches, and
	 * then does nothing: no layout read, no observer, no listener, no attribute.
	 *
	 * That serves a container that cannot overflow in one of its states. A
	 * scroller with no height constraint grows with its content, so neither
	 * attribute can ever change, and the watch is dead work. `Menu` gates on
	 * `capped`, the flag that emits its viewport's `max-h`.
	 *
	 * @defaultValue true
	 */
	enabled?: boolean
}

/**
 * Stamps vertical scroll-overflow state onto a scroll container. The node
 * carries `data-overflow-above` / `data-overflow-below` while content extends
 * past the respective edge, and drops each attribute when that edge is
 * reached. Style the attributes to build scroll affordances — edge fades,
 * shadows, arrows — in CSS.
 *
 * @param options - The enable gate, for a container that cannot overflow in
 * one of its states.
 * @returns A callback ref to attach to the scroll container.
 *
 * @remarks
 * State updates on scroll, on resize of the node or its direct children, and
 * on child additions or removals. Horizontal overflow is not tracked. The ref
 * cleans up its listeners and attributes on detach (React 19 ref cleanup).
 *
 * A flip of `enabled` swaps the ref identity, so React detaches the node and
 * attaches it again. The cleanup clears both attributes, and the attach that
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

				node.toggleAttribute('data-overflow-above', above)

				node.toggleAttribute('data-overflow-below', below)
			}

			update()

			node.addEventListener('scroll', update, { passive: true })

			const resizes = new ResizeObserver(update)

			const observeChildren = () => {
				resizes.disconnect()

				resizes.observe(node)

				for (const child of node.children) resizes.observe(child)
			}

			observeChildren()

			// Children added or removed after mount change the scroll extent without
			// resizing any observed element; re-seat the observer and re-measure.
			const mutations = new MutationObserver(() => {
				observeChildren()

				update()
			})

			mutations.observe(node, { childList: true })

			return () => {
				node.removeEventListener('scroll', update)

				mutations.disconnect()

				resizes.disconnect()

				node.removeAttribute('data-overflow-above')

				node.removeAttribute('data-overflow-below')
			}
		},
		[enabled],
	)
}
