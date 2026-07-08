'use client'

import { type RefCallback, useCallback } from 'react'

/** Tolerance for fractional scroll offsets on zoomed or high-DPI displays. */
const EDGE_EPSILON_PX = 1

/**
 * Stamps vertical scroll-overflow state onto a scroll container: the node
 * carries `data-overflow-above` / `data-overflow-below` while content extends
 * past the respective edge, and drops each attribute when that edge is
 * reached. Style the attributes to build scroll affordances — edge fades,
 * shadows, arrows — in CSS.
 *
 * @returns A callback ref to attach to the scroll container.
 *
 * @remarks
 * State updates on scroll, on resize of the node or its direct children, and
 * on child additions or removals. Horizontal overflow is not tracked. The ref
 * cleans up its listeners and attributes on detach (React 19 ref cleanup).
 *
 * @example
 * ```tsx
 * const scrollOverflowRef = useScrollOverflow()
 *
 * <div ref={scrollOverflowRef} className="overflow-y-auto data-overflow-below:...">
 * ```
 */
export function useScrollOverflow(): RefCallback<HTMLElement> {
	return useCallback((node: HTMLElement | null) => {
		if (!node) return

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

			for (const child of Array.from(node.children)) resizes.observe(child)
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
	}, [])
}
