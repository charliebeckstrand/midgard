'use client'

import {
	useVirtualizer,
	type VirtualItem,
	type Virtualizer,
	type VirtualizerOptions,
} from '@tanstack/react-virtual'
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
	/**
	 * The distance in pixels from the top of the scroll content to the first
	 * item. Content above the list, such as a table head, sets it. Without it,
	 * `scrollToIndex` misplaces each row by that distance.
	 *
	 * @defaultValue 0
	 */
	scrollMargin?: number
	/**
	 * The height in pixels of sticky content over the top edge of the scroller,
	 * such as a sticky table head. `scrollToIndex` aligns a row below it, so the
	 * row does not go under it.
	 *
	 * @defaultValue 0
	 */
	scrollPaddingStart?: number
	/**
	 * The height in pixels of sticky content over the bottom edge of the
	 * scroller, such as a sticky footer row. `scrollToIndex` aligns a row above
	 * it, so the row does not go under it.
	 *
	 * @defaultValue 0
	 */
	scrollPaddingEnd?: number
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
	/**
	 * The edge the window holds when rows change size or the list changes
	 * length. With `'end'`, a row that grows while the reader sits at the end
	 * keeps the end in view. A list that is pinned to its newest row, such as a
	 * chat transcript, sets it.
	 *
	 * @remarks The anchor has no mount arm. A list that must open at its end
	 * calls `scrollToIndex(count - 1, { align: 'end' })` once its window holds rows.
	 *
	 * @defaultValue 'start'
	 */
	anchorTo?: VirtualizerOptions<HTMLElement, Element>['anchorTo']
	/**
	 * How the window follows a row appended at the end. It follows only when the
	 * reader sat at the end before the append, so a reader who scrolled up stays
	 * where they are. `true` jumps, and a `ScrollBehavior` names the motion.
	 * It acts only with `anchorTo: 'end'`.
	 *
	 * @defaultValue false
	 */
	followOnAppend?: VirtualizerOptions<HTMLElement, Element>['followOnAppend']
}

/**
 * Tells the virtualizer to adjust the scroll offset when a row above the
 * viewport changes size, in each scroll direction. The library default makes
 * no adjustment while the reader scrolls up, so the content in view drifts by
 * the height difference. The measured path sets this, and the uniform path
 * keeps the default.
 *
 * @internal
 */
const adjustAboveViewport = (
	item: VirtualItem,
	_delta: number,
	instance: Virtualizer<HTMLElement, Element>,
): boolean => item.start < (instance.scrollOffset ?? 0)

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
	/**
	 * Pixel height of the spacer standing in for rows below the viewport. While
	 * the window is empty, it holds the height of every row.
	 */
	bottomSpacer: number
	/**
	 * Scrolls the item at `index` into the window, mounting it if it was outside
	 * it. `behavior: 'smooth'` glides there, and the default jumps.
	 */
	scrollToIndex: (
		index: number,
		options?: { align?: 'auto' | 'center' | 'end' | 'start'; behavior?: 'auto' | 'smooth' },
	) => void
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
 * On the measured path a row above the viewport can measure while the reader
 * scrolls up. The hook then moves the scroll offset by the height difference,
 * so the rows in view do not move. The library default skips this adjustment
 * during a scroll up, and the content drifts. The uniform path keeps the
 * default, because its rows do not measure.
 *
 * The measured path also takes the virtualizer's end anchor. `anchorTo: 'end'`
 * and `followOnAppend` pass through as they are, so a list pinned to its newest
 * row holds the pin through the virtualizer. It does not write `scrollTop` from
 * outside, because the total height moves as rows measure.
 *
 * Content above the first item, such as a table head, moves every row down
 * by its height. The caller passes that height as `scrollMargin`, so
 * `scrollToIndex` aligns the real row. Sticky content over the top edge, such
 * as a sticky head, covers a row that aligns to the start. The caller passes
 * its height as `scrollPaddingStart`, and each alignment lands the row below
 * it. Sticky content over the bottom edge passes its height as
 * `scrollPaddingEnd`, and a row lands above it. The spacers exclude the
 * margin, so the caller renders them as before. Each defaults to zero, and the
 * call is then the same as before.
 *
 * The window is empty until the virtualizer measures a scroller of some
 * height. While the window is empty, `bottomSpacer` holds the height of every
 * row: `count` times a number estimate, or the sum of a function estimate. A
 * scroller that only `maxHeight` bounds thus grows to its cap, and the first
 * window can resolve. A caller that draws stand-in rows while the window is
 * empty, such as a skeleton, can leave this spacer out until rows render.
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
	scrollMargin,
	scrollPaddingStart,
	scrollPaddingEnd,
	getItemKey,
	anchorTo,
	followOnAppend,
}: VirtualWindowOptions & Partial<MeasuredVirtualWindowOptions>): MeasuredVirtualWindow {
	// `@tanstack/react-virtual` reads these getters off the options object each
	// cycle; a fresh closure per render busts its internal option identity. A
	// function estimate passes through as it is, so it keeps the caller's identity.
	const getSize = useMemo(
		() => (typeof estimateSize === 'number' ? () => estimateSize : estimateSize),
		[estimateSize],
	)

	// An undefined `getItemKey` leaves the library's index key in place: the
	// virtualizer drops undefined options rather than writing them over its
	// defaults. The same rule keeps the start anchor and no follow on the uniform
	// path, and a zero scroll margin and paddings where the caller gives none.
	const virtualizer = useVirtualizer({
		count,
		getScrollElement,
		estimateSize: getSize,
		overscan,
		scrollMargin,
		scrollPaddingStart,
		scrollPaddingEnd,
		getItemKey,
		anchorTo,
		followOnAppend,
	})

	// A row above the viewport that measures while the reader scrolls up must not
	// move the rows in view. The library default skips that adjustment, so the
	// measured path replaces it. The uniform path writes nothing here.
	if (getItemKey) virtualizer.shouldAdjustScrollPositionOnItemSizeChange = adjustAboveViewport

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

	// An item's start and end include the scroll margin, and the total size does
	// not. The spacers sit below the content above the list, so they subtract it.
	const margin = scrollMargin ?? 0

	const topSpacer = (virtualItems[0]?.start ?? margin) - margin

	const lastItem = virtualItems.at(-1)

	// An empty window has no row to measure from, so the bottom spacer holds the
	// full height. A scroller that only `maxHeight` bounds then grows to its cap.
	// Without this it measures zero, and the window stays empty for good.
	const bottomSpacer = lastItem ? totalSize - (lastItem.end - margin) : totalSize

	return {
		virtualItems,
		topSpacer,
		bottomSpacer,
		scrollToIndex: virtualizer.scrollToIndex,
		measureRef: virtualizer.measureElement,
	}
}
