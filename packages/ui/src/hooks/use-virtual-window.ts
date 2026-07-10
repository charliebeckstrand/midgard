'use client'

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { useCallback, useEffect, useReducer } from 'react'

type VirtualWindowOptions = {
	/** Total number of items in the full (unvirtualized) list. */
	count: number
	/** Returns the scroll container, or null before it mounts. */
	getScrollElement: () => HTMLElement | null
	/** Estimated row height in pixels. Assumes uniform heights. */
	estimateSize: number
	/** Rows to render outside the viewport on each side. */
	overscan: number
}

type VirtualWindow = {
	/** The items currently in the viewport plus overscan, in order. */
	virtualItems: VirtualItem[]
	/** Pixel height of the spacer standing in for rows above the viewport. */
	topSpacer: number
	/** Pixel height of the spacer standing in for rows below the viewport. */
	bottomSpacer: number
	/** Scrolls the item at `index` into the window, mounting it if it was outside it. */
	scrollToIndex: (index: number, options?: { align?: 'auto' | 'center' | 'end' | 'start' }) => void
	/**
	 * Ref callback opting a row into dynamic measurement: attach to each row
	 * element alongside a `data-index={virtualItem.index}` attribute and the
	 * virtualizer replaces `estimateSize` with the row's rendered height, so
	 * variable-height rows (chat bubbles, rich cells) window without drift.
	 * Rows that never attach it keep the uniform estimate.
	 */
	measureElement: (el: Element | null) => void
}

/**
 * Drive a vertical windowed list off `@tanstack/react-virtual`, returning the
 * visible items plus the top/bottom spacer heights that stand in for the rows
 * outside the viewport. Callers render their own row and spacer elements
 * (table rows, list divs); this owns only the virtualizer wiring and the
 * spacer math. Uniform `estimateSize` heights by default; rows opt into
 * per-row measurement via the returned `measureElement`.
 */
export function useVirtualWindow({
	count,
	getScrollElement,
	estimateSize,
	overscan,
}: VirtualWindowOptions): VirtualWindow {
	// `@tanstack/react-virtual` reads these getters off the options object each
	// cycle; a fresh closure per render busts its internal option identity.
	const getSize = useCallback(() => estimateSize, [estimateSize])

	const virtualizer = useVirtualizer({
		count,
		getScrollElement,
		estimateSize: getSize,
		overscan,
	})

	// Re-sync guard: the virtualizer captures its scroll element in a layout
	// effect, which runs *before* an ancestor's ref attaches when that ancestor
	// (re)mounted in the same commit (React commits bottom-up). It then resolves
	// `null`, renders an empty window, and — with no further renders — never
	// recovers. This passive effect runs after every commit (refs all attached
	// by then) and forces one re-render whenever the virtualizer's captured
	// element diverges from the live one, letting it re-attach and measure.
	const [, forceResync] = useReducer((x: number) => x + 1, 0)

	useEffect(() => {
		if (virtualizer.scrollElement !== getScrollElement()) forceResync()
	})

	const virtualItems = virtualizer.getVirtualItems()

	const totalSize = virtualizer.getTotalSize()

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems[virtualItems.length - 1]

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	return {
		virtualItems,
		topSpacer,
		bottomSpacer,
		scrollToIndex: virtualizer.scrollToIndex,
		measureElement: virtualizer.measureElement,
	}
}
