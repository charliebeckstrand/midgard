'use client'

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { useCallback } from 'react'

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
}

/**
 * Drive a vertical windowed list off `@tanstack/react-virtual`, returning the
 * visible items plus the top/bottom spacer heights that stand in for the rows
 * outside the viewport. Callers render their own row and spacer elements
 * (table rows, list divs); this owns only the virtualizer wiring and the
 * spacer math, which is otherwise copy-pasted at every call site.
 */
export function useVirtualWindow({
	count,
	getScrollElement,
	estimateSize,
	overscan,
}: VirtualWindowOptions): VirtualWindow {
	// `@tanstack/react-virtual` reads these getters off the options object each
	// cycle; a fresh closure per render busts its internal option identity.
	// The size getter is kept referentially stable across renders.
	const getSize = useCallback(() => estimateSize, [estimateSize])

	const virtualizer = useVirtualizer({
		count,
		getScrollElement,
		estimateSize: getSize,
		overscan,
	})

	const virtualItems = virtualizer.getVirtualItems()

	const totalSize = virtualizer.getTotalSize()

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems[virtualItems.length - 1]

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	return { virtualItems, topSpacer, bottomSpacer }
}
