'use client'

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import { useEffect, useMemo, useReducer } from 'react'

/** Options for {@link useVirtualWindow}: the item count, the size estimate, and the overscan. */
export type VirtualWindowOptions = {
	/** Total number of items in the full (unvirtualized) list. */
	count: number
	/** Returns the scroll container, or null before it mounts. */
	getScrollElement: () => HTMLElement | null
	/**
	 * Row height in pixels, as one number or as a function of the index. On the
	 * uniform path every row must match it. On the measured path it is only the
	 * first guess for a row that has not measured yet. Keep a function's identity
	 * stable, because each new identity makes a new estimate getter.
	 */
	estimateSize: number | ((index: number) => number)
	/** Rows to render outside the viewport on each side. */
	overscan: number
}

/**
 * Options for the measured path of {@link useVirtualWindow}: the uniform options
 * plus the stable row key that turns measurement on.
 */
export type MeasuredVirtualWindowOptions = VirtualWindowOptions & {
	/**
	 * Returns a stable key for the row at `index`. The virtualizer caches each
	 * measured height against this key, so a height stays with its row when rows
	 * are inserted above it. Memoize it over the data it reads: a new identity
	 * rebuilds every row position, and a stale one keeps the old keys.
	 */
	getItemKey: (index: number) => VirtualItem['key']
}

type VirtualWindow = {
	/**
	 * The items currently in the viewport plus overscan, in order. Empty until the
	 * virtualizer has resolved *and* measured the scroll element. That is the commit
	 * the re-sync guard below recovers, plus every commit while the element measures
	 * zero (a `display: none` ancestor, a server render). A caller holding
	 * items in hand must not read an empty window as "no items to show".
	 */
	virtualItems: VirtualItem[]
	/** Pixel height of the spacer standing in for rows above the viewport. */
	topSpacer: number
	/** Pixel height of the spacer standing in for rows below the viewport. */
	bottomSpacer: number
	/** Scrolls the item at `index` into the window, mounting it if it was outside it. */
	scrollToIndex: (index: number, options?: { align?: 'auto' | 'center' | 'end' | 'start' }) => void
}

type MeasuredVirtualWindow = VirtualWindow & {
	/**
	 * Ref callback for each rendered row element. The element must carry
	 * `data-index={virtualItem.index}`, which the virtualizer reads to find the
	 * row. It measures the row when it attaches and again on each resize.
	 */
	measureRef: (node: Element | null) => void
}

/**
 * Drive a vertical windowed list off `@tanstack/react-virtual`, returning the
 * visible items plus the top/bottom spacer heights that stand in for the rows
 * outside the viewport. Callers render their own row and spacer elements
 * (table rows, list divs); this owns only the virtualizer wiring and the
 * spacer math.
 *
 * @remarks The hook has two paths, and the uniform path is the default.
 *
 * On the uniform path the wrapper passes react-virtual no `getItemKey` and the
 * caller attaches no measurement, so every row must measure `estimateSize`. A
 * row that does not misplaces the window below it. This path costs no
 * `ResizeObserver` work, so keep it for rows that do not vary.
 *
 * The measured path starts when the caller passes `getItemKey`. The hook then
 * also returns `measureRef`, and the caller attaches it to each rendered row.
 * Each row measures its real height, so the spacers and the positions follow
 * the rows as they measure. The key is required, and the hook does not guess
 * it. A height cached against an index goes stale when rows are inserted
 * above it.
 *
 * The grid stays on the uniform path. `resolveGroupingGates` stands
 * virtualization down whenever grouping or master-detail is active, because
 * each renders its own body of mixed-height rows. The measured path does not
 * lift that gate by itself. `measureElement` on a `<tr>` in a fixed-layout
 * table with spacer rows is unverified. The group collapse animation also
 * needs its leaves mounted across the `1fr`↔`0fr` transition, which a window
 * unmounts.
 */
export function useVirtualWindow(options: VirtualWindowOptions): VirtualWindow

export function useVirtualWindow(options: MeasuredVirtualWindowOptions): MeasuredVirtualWindow

export function useVirtualWindow({
	count,
	getScrollElement,
	estimateSize,
	overscan,
	getItemKey,
}: VirtualWindowOptions & Partial<MeasuredVirtualWindowOptions>): MeasuredVirtualWindow {
	// `@tanstack/react-virtual` reads these getters off the options object each
	// cycle; a fresh closure per render busts its internal option identity. A
	// function estimate passes through as it is, so it keeps the caller's identity.
	const getSize = useMemo(
		() => (typeof estimateSize === 'number' ? () => estimateSize : estimateSize),
		[estimateSize],
	)

	// An undefined `getItemKey` leaves the library's index key in place: the
	// virtualizer drops undefined options rather than writing them over its defaults.
	const virtualizer = useVirtualizer({
		count,
		getScrollElement,
		estimateSize: getSize,
		overscan,
		getItemKey,
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

	// On the measured path `getTotalSize()` moves with each measurement, and the
	// spacers read it on each render, so they follow the rows as they measure.
	const totalSize = virtualizer.getTotalSize()

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems.at(-1)

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	return {
		virtualItems,
		topSpacer,
		bottomSpacer,
		scrollToIndex: virtualizer.scrollToIndex,
		measureRef: virtualizer.measureElement,
	}
}
