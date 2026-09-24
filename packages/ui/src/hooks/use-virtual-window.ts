'use client'

import {
	elementScroll,
	observeElementOffset,
	observeElementRect,
	type VirtualItem,
	Virtualizer,
	type VirtualizerOptions,
} from '@tanstack/react-virtual'
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

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
	 * chat transcript, sets it. With `'start'`, the first row in view holds
	 * still when rows above it are inserted or removed.
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
 * keeps the default. A row under sticky content at the top edge, which
 * `scrollPaddingStart` names, is above the viewport too, because the reader
 * cannot see it. An empty row that ends at the top edge is above it as well.
 * Rows that an insert adds there at 0 pixels sit before the first row in view.
 *
 * @internal
 */
const adjustAboveViewport = (
	item: VirtualItem,
	_delta: number,
	instance: Virtualizer<HTMLElement, Element>,
): boolean => {
	const top = viewTop(instance)

	return item.start < top || item.end <= top
}

/** The top edge of the part of the scroller that the reader sees. @internal */
function viewTop(instance: Virtualizer<HTMLElement, Element>): number {
	return (instance.scrollOffset ?? 0) + instance.options.scrollPaddingStart
}

/**
 * The fields of the virtualizer that its `scroll` handler writes. A scroll
 * adjustment moves the scroller at once, but the virtualizer reads the new
 * offset only from the next `scroll` event. Until then `scrollAdjustments`
 * holds the moves. @internal
 */
type ScrollState = { scrollAdjustments: number; _intendedScrollOffset: number | null }

/** Where the scroller is once the pending adjustments land. @internal */
function effectiveOffset(instance: Virtualizer<HTMLElement, Element>): number {
	return (instance.scrollOffset ?? 0) + (instance as unknown as ScrollState).scrollAdjustments
}

/**
 * Returns the ref callback that measures each row in the commit that attaches
 * it. The library's `measureElement` does not measure a row that attaches
 * while its `isScrolling` flag is set. Each `scroll` event sets that flag for
 * 150 ms, and a start-anchor move or a scroll adjustment sends a `scroll`
 * event. Such a row keeps its size estimate until a `ResizeObserver` callback
 * measures it. Until then the rendered rows do not agree with the item
 * positions. A start-anchor move then holds the row at a position that the
 * layout does not have. A render between the commit and that callback can
 * also attach more rows that did not measure. This callback measures the row
 * at once. Its scroll adjustment and the render that follows it then land in
 * the same commit.
 *
 * @internal
 */
function measureOnAttach(
	virtualizer: Virtualizer<HTMLElement, Element>,
): (node: Element | null) => void {
	return (node) => {
		virtualizer.measureElement(node)

		// The library measured the row already when it did not count a scroll.
		if (!node?.isConnected || !virtualizer.isScrolling) return

		const index = virtualizer.indexFromElement(node)

		virtualizer.resizeItem(index, virtualizer.options.measureElement(node, undefined, virtualizer))
	}
}

/**
 * The item positions after each measurement so far. `measurementsCache` is a
 * view that the virtualizer updates only when it computes its positions again.
 * A row that measures in a commit leaves that view stale until then.
 * `getTotalSize` computes the positions again. @internal
 */
function freshMeasurements(instance: Virtualizer<HTMLElement, Element>): VirtualItem[] {
	instance.getTotalSize()

	return instance.measurementsCache
}

/**
 * A row that the start anchor can hold: its index, its key, and its distance
 * from the scroll offset. @internal
 */
type StartAnchorRow = { index: number; key: VirtualItem['key']; offset: number }

/**
 * What a commit records for the start anchor. It holds the count and the key
 * getter of that render. It also holds the rendered rows that end below the
 * top edge, in order. The layout effect reads each distance after the rows of
 * the commit measure. @internal
 */
type StartAnchorRecord = {
	count: number
	getItemKey: (index: number) => VirtualItem['key']
	rows: readonly StartAnchorRow[]
}

/**
 * Records the rendered rows that end below the top edge, with fresh positions.
 * @internal
 */
function recordStartAnchor(
	instance: Virtualizer<HTMLElement, Element>,
	count: number,
	getItemKey: (index: number) => VirtualItem['key'],
	window: readonly VirtualItem[],
): StartAnchorRecord {
	const measurements = freshMeasurements(instance)

	const offset = effectiveOffset(instance)

	const top = offset + instance.options.scrollPaddingStart

	const rows: StartAnchorRow[] = []

	for (const { index, key } of window) {
		const item = measurements[index]

		if (item && item.end > top) rows.push({ index, key, offset: item.start - offset })
	}

	return { count, getItemKey, rows }
}

/**
 * The index of `key` in the new list. It tries the old index, then the
 * rendered window, and only then the whole list. @internal
 */
function indexOfKey(
	key: VirtualItem['key'],
	oldIndex: number,
	count: number,
	getItemKey: (index: number) => VirtualItem['key'],
	window: readonly VirtualItem[],
): number {
	if (oldIndex < count && getItemKey(oldIndex) === key) return oldIndex

	const rendered = window.find((item) => item.key === key)

	if (rendered) return rendered.index

	for (let index = 0; index < count; index++) {
		if (getItemKey(index) === key) return index
	}

	return -1
}

/**
 * Holds the first recorded row that is still in the list at the distance it
 * had from the scroll offset. It moves the scroller, and takes the new offset
 * into the virtualizer as its `scroll` handler does. The next render then
 * places its window at the new offset, before the paint. The positions include
 * each row that measured in this commit.
 *
 * @param window - The rendered items of the render.
 * @returns The record of the new list, or `null` when the list did not change.
 * @internal
 */
function holdStartAnchor(
	virtualizer: Virtualizer<HTMLElement, Element>,
	record: StartAnchorRecord,
	count: number,
	getItemKey: (index: number) => VirtualItem['key'],
	window: readonly VirtualItem[],
): StartAnchorRecord | null {
	if (record.count === count && record.getItemKey === getItemKey) return null

	const element = virtualizer.scrollElement

	const measurements = freshMeasurements(virtualizer)

	for (const row of record.rows) {
		const index = indexOfKey(row.key, row.index, count, getItemKey, window)

		const start = index < 0 ? undefined : measurements[index]?.start

		if (start === undefined) continue

		const target = start - row.offset

		// A scroller that cannot move there clamps the offset, so a scroller that
		// does not scroll takes no change.
		if (element && Math.abs(target - effectiveOffset(virtualizer)) >= 1) {
			element.scrollTop = target

			const state = virtualizer as unknown as ScrollState

			virtualizer.scrollOffset = element.scrollTop

			state.scrollAdjustments = 0

			state._intendedScrollOffset = null
		}

		const offset = start - effectiveOffset(virtualizer)

		return { count, getItemKey, rows: [{ index, key: row.key, offset }] }
	}

	return { count, getItemKey, rows: [] }
}

/**
 * The state of the virtualizer that a render reads, less `isScrolling`: the
 * visible range and the version of the measured sizes. @internal
 */
type WindowState = { start: number | null; end: number | null; sizes: number }

/**
 * The fields of the virtualizer that {@link windowState} reads. The size
 * version is private in virtual-core 3.16. @internal
 */
type WindowFields = { itemSizeCacheVersion: number }

/**
 * The visible range and the size version of the virtualizer, as its fields
 * hold them now. It reads the fields and computes nothing. A computation of
 * the positions between two `resizeItem` calls of one `ResizeObserver` batch
 * changes the positions that the second call reads. @internal
 */
function windowState(instance: Virtualizer<HTMLElement, Element>): WindowState {
	return {
		start: instance.range?.startIndex ?? null,
		end: instance.range?.endIndex ?? null,
		sizes: (instance as unknown as WindowFields).itemSizeCacheVersion,
	}
}

/** Whether two window states render the same window. @internal */
function sameWindowState(a: WindowState, b: WindowState): boolean {
	return a.start === b.start && a.end === b.end && a.sizes === b.sizes
}

/** The options that {@link useWindowVirtualizer} passes through. @internal */
type WindowVirtualizerOptions = Omit<
	VirtualizerOptions<HTMLElement, Element>,
	'observeElementRect' | 'observeElementOffset' | 'scrollToFn' | 'onChange'
>

/**
 * Drives a virtual-core `Virtualizer` over an element scroller, as
 * `useVirtualizer` of react-virtual does, but renders only when the window
 * changes. The library renders on each change of `isScrolling` too. A
 * `scroll` event sets that flag, and 150 ms later the flag clears. A scroll
 * step that keeps the rendered items thus paid two renders of the whole list.
 * A start-anchor move sends a `scroll` event, so it paid them as well. No
 * caller reads `isScrolling` from a render. `measureOnAttach` reads it live
 * from the virtualizer.
 *
 * A change renders when the visible range or a measured size differs from the
 * last commit. The rendered items, their positions, and the total size follow
 * from those and from the options, which change only in a render. A change
 * that the virtualizer marks as synchronous renders in a `flushSync`, as in
 * the library.
 *
 * @returns The virtualizer, and the callback that records the window state of
 * a commit. Call it in a layout effect with the state that the render read.
 * @internal
 */
function useWindowVirtualizer(
	options: WindowVirtualizerOptions,
): [Virtualizer<HTMLElement, Element>, (state: WindowState) => void] {
	const [, rerender] = useReducer((x: number) => x + 1, 0)

	// The window state of the last commit. It is written in a layout effect, so a
	// render that React discards does not change it.
	const shown = useRef<WindowState | null>(null)

	const resolved: VirtualizerOptions<HTMLElement, Element> = {
		observeElementRect,
		observeElementOffset,
		scrollToFn: elementScroll,
		...options,
		onChange: (instance, sync) => {
			const last = shown.current

			if (last && sameWindowState(last, windowState(instance))) return

			if (sync) flushSync(rerender)
			else rerender()
		},
	}

	const [instance] = useState(() => new Virtualizer<HTMLElement, Element>(resolved))

	instance.setOptions(resolved)

	useLayoutEffect(() => instance._didMount(), [instance])

	useLayoutEffect(() => instance._willUpdate())

	const record = useMemo(
		() => (state: WindowState) => {
			shown.current = state
		},
		[],
	)

	return [instance, record]
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
 * outside the viewport. Callers render their own row and spacer
 * elements (table rows, list divs); this owns only the virtualizer wiring and
 * the spacer math.
 *
 * The hook renders only when the rendered items, their positions, or the total
 * size change. A scroll step that keeps the rendered rows renders nothing, and
 * neither does the `scroll` event of a start-anchor move.
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
 * so the rows in view do not move. A row under the sticky content that
 * `scrollPaddingStart` names counts as above the viewport. The library default
 * skips this adjustment during a scroll up, and the content drifts. The
 * uniform path keeps the default, because its rows do not measure.
 *
 * An insert or a removal is not a resize, so a resize adjustment does not see
 * it. The measured path with the start anchor therefore holds the first row
 * in view. Each commit records the rendered rows that end below the top edge,
 * with the distance of each from the scroll offset. After a render with a new
 * count or a new `getItemKey`, a layout effect finds the first recorded row
 * that is still in the list. It moves the scroll offset so that the row has
 * its old distance, and renders again before the paint. A recorded row that
 * left the list, or took a new key, gives way to the next. On this path each
 * row measures in the commit that attaches it, also while the reader scrolls.
 * The positions that the anchor reads thus agree with the layout.
 *
 * The anchor writes the offset into the virtualizer as its `scroll` handler
 * does. Version 3.16 of virtual-core has an anchor step of its own. It reads
 * the new offset only from the next `scroll` event. A render before that event
 * paints the window at the old offset, and a second list change in that gap
 * anchors against a stale offset. A scroller that does not scroll takes no
 * change, and the render after a move holds no anchor, so a move never starts
 * another.
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
 * The flat grid body stays on the uniform path. The client-grouped body and
 * the master-detail body take the measured path under `virtualize`. Their
 * headers, totals, and detail panels do not share one height. Each keeps a
 * closing row, a group row or a detail panel, as an item until its reveal
 * lands, so the close animation still plays.
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
	// The virtualizer reads these getters off the options object each cycle; a
	// fresh closure per render busts its internal option identity. A function
	// estimate passes through as it is, so it keeps the caller's identity.
	const getSize = useMemo(
		() => (typeof estimateSize === 'number' ? () => estimateSize : estimateSize),
		[estimateSize],
	)

	// An undefined `getItemKey` leaves the library's index key in place: the
	// virtualizer drops undefined options rather than writing them over its
	// defaults. The same rule keeps the start anchor and no follow on the uniform
	// path, and a zero scroll margin and paddings where the caller gives none.
	const [virtualizer, recordShown] = useWindowVirtualizer({
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

	// The start anchor. virtual-core 3.16 holds only the end edge. The measured
	// path holds the start edge in a layout effect below.
	const startAnchor = getItemKey != null && anchorTo !== 'end'

	const anchorRecord = useRef<StartAnchorRecord | null>(null)

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

	// The start anchor needs each row to measure in the commit that attaches it.
	// The end anchor keeps the library's measurement.
	const measureRef = useMemo(
		() => (startAnchor ? measureOnAttach(virtualizer) : virtualizer.measureElement),
		[startAnchor, virtualizer],
	)

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

	// The state that this render read. A virtualizer change that keeps it renders
	// nothing.
	const rendered = windowState(virtualizer)

	useLayoutEffect(() => {
		recordShown(rendered)
	})

	// Each commit records the rendered rows that end below the top edge, so a
	// later list change can hold the first of them still. The record reads the
	// virtualizer alone, not the DOM.
	useLayoutEffect(() => {
		if (!startAnchor || !getItemKey) {
			anchorRecord.current = null

			return
		}

		// A render with a new list holds the first recorded row still. The move
		// renders once more before the paint. The new record names the new list,
		// so that render holds nothing, and the move does not start another one.
		const before = effectiveOffset(virtualizer)

		const previous = anchorRecord.current

		const held = previous && holdStartAnchor(virtualizer, previous, count, getItemKey, virtualItems)

		if (held && Math.abs(effectiveOffset(virtualizer) - before) >= 1) {
			anchorRecord.current = held

			forceResync()

			return
		}

		anchorRecord.current = recordStartAnchor(virtualizer, count, getItemKey, virtualItems)
	})

	return {
		virtualItems,
		topSpacer,
		bottomSpacer,
		scrollToIndex: virtualizer.scrollToIndex,
		measureRef,
	}
}
