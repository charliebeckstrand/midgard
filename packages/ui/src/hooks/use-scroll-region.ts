'use client'

import { type RefCallback, useCallback } from 'react'
import { observeScrollExtent } from './observe-scroll-extent'

/** An overflow value that lets the user scroll the box. @internal */
const SCROLLABLE = /auto|scroll/

/**
 * Whether the user can scroll `node` on either axis. The scroll size counts
 * content past the edge also for `overflow: visible`, so each axis also asks
 * whether its overflow value scrolls. A parent can set a scroll container to
 * `visible` and scroll the content itself, as the Grid does with its Table.
 *
 * @internal
 */
function scrollsOn(node: HTMLElement): boolean {
	const style = getComputedStyle(node)

	return (
		(node.scrollWidth > node.clientWidth && SCROLLABLE.test(style.overflowX)) ||
		(node.scrollHeight > node.clientHeight && SCROLLABLE.test(style.overflowY))
	)
}

/** Options for {@link useScrollRegion}: the accessible name the region takes while it scrolls. */
export type ScrollRegionOptions = {
	/**
	 * The accessible name of the region. While the container overflows, it
	 * carries `role="region"` and this name.
	 */
	label?: string
	/**
	 * The id of the element that names the region. It replaces `label` when
	 * both are set.
	 */
	labelledBy?: string
}

/**
 * Makes a scroll container a keyboard tab stop while its content overflows on
 * either axis. A keyboard-only user can then focus the container and scroll it
 * with the arrow keys (WCAG 2.1.1, axe `scrollable-region-focusable`).
 *
 * While the container overflows, it carries `tabindex="0"`. With a `label` or
 * a `labelledBy`, it also carries `role="region"` and that name. When the
 * content fits again, the hook removes the attributes, so a container that
 * does not scroll adds no empty tab stop.
 *
 * @param options - The accessible name of the region.
 * @returns A callback ref to attach to the scroll container.
 *
 * @remarks
 * Chromium and Firefox make an overflowing scroller focusable without help,
 * but Safari does not. The hook gives all engines the same rule. A container
 * that already carries a `tabindex` when the ref attaches keeps it, and the
 * hook does not change it.
 *
 * The state updates on a resize of the node or of its direct children, on a
 * child addition or removal, and after the fonts load. The ref removes its
 * attributes on detach (React 19 ref cleanup). The attributes go on the node
 * directly, so a change in overflow does not render the component again.
 *
 * Give the container a visible focus style, such as the `focus.inset` ring,
 * because the browser paints only its own outline.
 *
 * @example
 * ```tsx
 * const scrollRegionRef = useScrollRegion({ label: 'Activity' })
 *
 * <div ref={scrollRegionRef} className="overflow-x-auto">
 * ```
 */
export function useScrollRegion(options: ScrollRegionOptions = {}): RefCallback<HTMLElement> {
	const { label, labelledBy } = options

	return useCallback(
		(node: HTMLElement | null) => {
			if (!node || node.hasAttribute('tabindex')) return

			// `labelledBy` wins over `label`, as `aria-labelledby` wins in the browser.
			const name: [string, string] | null = labelledBy
				? ['aria-labelledby', labelledBy]
				: label
					? ['aria-label', label]
					: null

			let scrolls = false

			const apply = (on: boolean) => {
				if (!on) {
					node.removeAttribute('tabindex')

					if (name) {
						node.removeAttribute('role')

						node.removeAttribute(name[0])
					}

					return
				}

				node.setAttribute('tabindex', '0')

				if (name) {
					node.setAttribute('role', 'region')

					node.setAttribute(...name)
				}
			}

			const update = () => {
				const next = scrollsOn(node)

				if (next === scrolls) return

				scrolls = next

				apply(next)
			}

			update()

			const stopObserving = observeScrollExtent(node, update)

			let fontsCanceled = false

			// A late font changes the width of the text, so the extent can change
			// with no resize of an observed box.
			document.fonts?.ready.then(() => {
				if (!fontsCanceled) update()
			})

			return () => {
				fontsCanceled = true

				stopObserving()

				if (scrolls) apply(false)
			}
		},
		[label, labelledBy],
	)
}
