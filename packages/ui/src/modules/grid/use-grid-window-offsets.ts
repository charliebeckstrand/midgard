'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'
import { stickyEdgeInsets } from './use-grid-navigation-columns'

/** The scroll margin and the start and end padding of the window, in pixels. @internal */
export type GridWindowOffsets = {
	scrollMargin: number
	scrollPaddingStart: number
	scrollPaddingEnd: number
}

const NO_OFFSETS: GridWindowOffsets = {
	scrollMargin: 0,
	scrollPaddingStart: 0,
	scrollPaddingEnd: 0,
}

const OFFSET_KEYS = Object.keys(NO_OFFSETS) as (keyof GridWindowOffsets)[]

/**
 * Measures the content above the data body for the virtualizer. The scroll
 * margin is the distance from the top of the scroll content to the body: the
 * header and a top new-row slot. The start padding is the height of the sticky
 * part of that content, so an aligned row lands below it (WCAG 2.4.11). The end
 * padding is the height of a bottom new-row slot, which sticks to the bottom
 * edge. A resize of the table measures again, and so does a slot that mounts.
 * Both paddings come from {@link stickyEdgeInsets}, which the cursor also reads,
 * so an aligned row and the active cell clear the same chrome. The flat, the
 * grouped, and the master-detail windowed bodies each read it.
 *
 * @remarks The header position comes in as a flag, so a grid with no sticky
 * header reads no computed style. That read costs about 8 ms on a jsdom mount.
 *
 * @internal
 */
export function useGridWindowOffsets(
	bodyRef: RefObject<HTMLTableSectionElement | null>,
	scrollRef: RefObject<HTMLDivElement | null>,
	stickyHeader: boolean,
): GridWindowOffsets {
	const [offsets, setOffsets] = useState(NO_OFFSETS)

	useLayoutEffect(() => {
		const body = bodyRef.current

		// The scroll ref of an ancestor attaches after this effect on the commit
		// that mounts both, so the body finds its own scroller as a fallback.
		const scroller = scrollRef.current ?? body?.closest<HTMLElement>('[data-slot="grid-scroll"]')

		const table = body?.closest('table')

		if (!body || !scroller || !table) return

		const measure = () => {
			const scrollMargin =
				body.getBoundingClientRect().top -
				scroller.getBoundingClientRect().top -
				scroller.clientTop +
				scroller.scrollTop

			const chrome = stickyEdgeInsets(body, stickyHeader)

			const next: GridWindowOffsets = {
				scrollMargin,
				scrollPaddingStart: chrome.top,
				scrollPaddingEnd: chrome.bottom,
			}

			// A change under one pixel moves no row, so it does not render again.
			setOffsets((current) =>
				OFFSET_KEYS.every((key) => Math.abs(current[key] - next[key]) < 1) ? current : next,
			)
		}

		measure()

		if (typeof ResizeObserver === 'undefined') return

		// A head that resizes changes the table size, and so does a new-row slot
		// that mounts, resizes, or unmounts.
		const observer = new ResizeObserver(measure)

		observer.observe(table)

		return () => observer.disconnect()
	}, [bodyRef, scrollRef, stickyHeader])

	return offsets
}
