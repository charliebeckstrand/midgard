'use client'

import { useState } from 'react'
import { getScroller } from '../../utilities/get-scroller'

/** The ref callbacks that {@link useStickyBars} gives. @internal */
export type StickyBars = {
	/** The ref of the root of the layout. Its scroller takes the scroll padding. */
	root: (node: HTMLElement | null) => (() => void) | undefined
	/** The ref of a bar that sticks at some widths. */
	bar: (node: HTMLElement | null) => (() => void) | undefined
	/**
	 * Measures the bars again. Call it when a bar starts or stops to stick and
	 * keeps its size, because no resize then tells the layout about the change.
	 */
	measure: () => void
}

/** The height from the top of the scroller that a bar covers, or 0 when it does not stick. */
function coverOf(bar: HTMLElement): number {
	const style = getComputedStyle(bar)

	if (style.position !== 'sticky' && style.position !== 'fixed') return 0

	const top = Number.parseFloat(style.top)

	return Number.isNaN(top) ? 0 : top + bar.getBoundingClientRect().height
}

function createStickyBars(): StickyBars {
	const bars = new Set<HTMLElement>()

	let scroller: HTMLElement | null = null

	let observer: ResizeObserver | undefined

	const measure = () => {
		if (!scroller) return

		const cover = Math.max(0, ...[...bars].map(coverOf))

		scroller.style.scrollPaddingTop = cover > 0 ? `${cover}px` : ''
	}

	return {
		root: (node) => {
			if (!node) return

			// With no scroll container, the root takes the padding: the scroll padding
			// of the root is the scroll padding of the viewport.
			const own = getScroller(node.parentElement) ?? node.ownerDocument.documentElement

			scroller = own

			// A bar shows, hides, or sticks at a breakpoint, and each of those
			// changes its size.
			observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)

			for (const bar of bars) observer?.observe(bar)

			measure()

			return () => {
				observer?.disconnect()

				observer = undefined

				own.style.scrollPaddingTop = ''

				scroller = null
			}
		},
		bar: (node) => {
			if (!node) return

			bars.add(node)

			observer?.observe(node)

			measure()

			return () => {
				bars.delete(node)

				observer?.unobserve(node)

				measure()
			}
		},
		measure,
	}
}

/**
 * Names the edge that the sticky bars of a layout cover, as the top
 * `scroll-padding` of the scroller of the layout. A scroll into view, a jump to
 * an anchor, and the flight of a `Lightbox` photo then keep clear of the bars.
 * The padding follows the bar that sticks at the current width, and it clears
 * when the layout unmounts.
 *
 * @remarks The padding is an inline style on the scroller, so it wins over a
 * `scroll-padding-top` that the app sets on the same element.
 * @internal
 */
export function useStickyBars(): StickyBars {
	const [bars] = useState(createStickyBars)

	return bars
}
