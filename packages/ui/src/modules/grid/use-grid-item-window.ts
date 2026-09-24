'use client'

import { type RefObject, type TransitionEvent, useCallback, useLayoutEffect, useRef } from 'react'
import { useVirtualWindow } from '../../hooks'
import { type GridWindowItemFlags, windowItemEstimate } from './engine/grid-items/items'
import { useGridWindowOffsets } from './use-grid-window-offsets'

/**
 * The window wiring that the grid passes to a windowed body.
 *
 * @internal
 */
export type GridItemWindowOptions = {
	scrollRef: RefObject<HTMLDivElement | null>
	/** The density row height, which is the first guess for each row that is not a detail panel. */
	estimateSize: number
	overscan: number
	/** Re-fits the columns once the window's rows render, when the autosizer had none to measure. */
	fitRenderedRows: () => void
	/** Whether the header sticks, so the window aligns a row below it. */
	stickyHeader: boolean
}

/**
 * The part of a window item that the window reads: its key, its kind, and the
 * flags of {@link GridWindowItemFlags}. @internal
 */
type WindowItem = { key: string; kind: string } & Partial<GridWindowItemFlags>

/**
 * The rendered window as the last commit left it. It holds the start and end
 * of each rendered item by key, and the viewport height. `viewTop` is the top
 * edge of the visible part: the scroll offset plus the sticky head, which
 * covers the rows under it. It also holds the item list of that commit and the
 * index of its first rendered item. `anchor` is the first row in view, with
 * its offset from the scroll offset. A body reads the snapshot during the
 * render that a toggle starts, to find which rows the user can see. @internal
 */
export type GridWindowSnapshot = {
	items: ReadonlyMap<string, { start: number; end: number }>
	viewTop: number
	viewport: number
	list: readonly { key: string }[]
	firstIndex: number
	anchor: { key: string; offset: number } | null
}

/** The snapshot before the first commit, which holds no rendered item. @internal */
export const NO_WINDOW_SNAPSHOT: GridWindowSnapshot = {
	items: new Map(),
	viewTop: 0,
	viewport: 0,
	list: [],
	firstIndex: -1,
	anchor: null,
}

/**
 * The steps that a body asks of the window for the next commit. Each is `null`
 * when the body does not need it.
 *
 * - `dropped` drops the dropping items, after the drop step sets each to 0
 *   pixels.
 * - `anchored` clears the request after the anchor step. That step holds the
 *   first row in view still across an insert above it.
 *
 * @internal
 */
export type GridWindowSteps = {
	dropped: (() => void) | null
	anchored: (() => void) | null
}

/**
 * Returns a test of whether the item with a key ends at or above the visible
 * top edge in the last commit. A rendered item compares its end with the offset.
 * An item outside the window is above it when its index is below the first
 * rendered index. The first such lookup indexes the list once.
 *
 * @internal
 */
export function aboveViewport(snapshot: GridWindowSnapshot): (key: string) => boolean {
	let indexOf: Map<string, number> | null = null

	return (key) => {
		const rendered = snapshot.items.get(key)

		if (rendered) return rendered.end <= snapshot.viewTop

		if (snapshot.firstIndex < 0) return false

		indexOf ??= new Map(snapshot.list.map((item, index) => [item.key, index]))

		return (indexOf.get(key) ?? Number.POSITIVE_INFINITY) < snapshot.firstIndex
	}
}

/**
 * The first rendered item that ends below the visible top edge, as the anchor
 * of the snapshot. Its offset is from the scroll offset. @internal
 */
function firstInView(
	virtualItems: readonly { index: number; start: number; end: number }[],
	items: readonly { key: string }[],
	scrollTop: number,
	viewTop: number,
): GridWindowSnapshot['anchor'] {
	const item = virtualItems.find((virtualItem) => virtualItem.end > viewTop)

	const key = item ? items[item.index]?.key : undefined

	return item && key !== undefined ? { key, offset: item.start - scrollTop } : null
}

/** The property that the row reveals animate. @internal */
const REVEAL_PROPERTY = 'grid-template-rows'

/**
 * Drives the measured window of a grouped or master-detail body over its item
 * list. It returns the body ref, the rendered items, the two spacer heights,
 * and the measure ref that each rendered row attaches. After each commit it
 * writes the rendered window to `snapshot`.
 *
 * @remarks Each item has a prefixed key, and the virtualizer caches each
 * measured height against it. The first guess comes from
 * {@link windowItemEstimate}. The scroll margin and the paddings come from
 * {@link useGridWindowOffsets}, as on the flat windowed body. The columns
 * re-fit from a layout effect once rows render, also as on the flat body.
 *
 * The hook also owns two steps that both bodies share, because an insert or a
 * removal is not a resize. The virtualizer does not move the scroll offset for
 * either.
 *
 * - The drop step. A body keeps each removed row for one commit as a dropping
 *   item. A layout effect sets each dropping item to 0 pixels, which moves the
 *   offset for an item above the viewport. The body then drops the items.
 * - The anchor step. After an insert, a layout effect finds the new start of
 *   the row that was first in view, and moves the offset by the difference.
 *   The rows above the viewport then take no room from the view.
 *
 * Both land before the paint.
 *
 * @param steps - The steps that the next commit runs (see {@link GridWindowSteps}).
 * @internal
 */
export function useGridItemWindow(
	items: readonly WindowItem[],
	options: GridItemWindowOptions,
	snapshot: RefObject<GridWindowSnapshot>,
	steps: GridWindowSteps,
) {
	const { scrollRef, estimateSize, overscan, fitRenderedRows, stickyHeader } = options

	const bodyRef = useRef<HTMLTableSectionElement>(null)

	const getScrollElement = useCallback(() => scrollRef.current, [scrollRef])

	const offsets = useGridWindowOffsets(bodyRef, scrollRef, stickyHeader)

	// Each new item list gives a new key getter and a new estimate. The
	// virtualizer then rebuilds the row positions, which a new list needs.
	const getItemKey = useCallback((index: number) => items[index]?.key ?? index, [items])

	const estimate = useCallback(
		(index: number) => windowItemEstimate(items[index]?.kind ?? '', estimateSize),
		[items, estimateSize],
	)

	const win = useVirtualWindow({
		count: items.length,
		getScrollElement,
		estimateSize: estimate,
		overscan,
		...offsets,
		getItemKey,
	})

	// The autosizer measures the rendered cells. A grid whose rows arrive after
	// mount fits against an empty window first, so the fit runs again once rows
	// render, before they paint (see `GridVirtualizedBody`).
	useLayoutEffect(() => {
		void win.virtualItems.length

		fitRenderedRows()
	}, [win.virtualItems.length, fitRenderedRows])

	const { resizeItem, getItemStart, setScrollOffset } = win

	const { dropped, anchored } = steps

	// The anchor step. It runs before the snapshot below records this commit, so
	// it reads the row that was first in view before the insert.
	useLayoutEffect(() => {
		if (!anchored) return

		const anchor = snapshot.current.anchor

		const index = anchor ? items.findIndex((item) => item.key === anchor.key) : -1

		const start = getItemStart(index)

		const scrollTop = scrollRef.current?.scrollTop ?? 0

		if (anchor && start !== undefined && Math.abs(start - anchor.offset - scrollTop) >= 1) {
			setScrollOffset(start - anchor.offset)
		}

		anchored()
	}, [anchored, items, getItemStart, setScrollOffset, scrollRef, snapshot])

	// Each commit records the rendered window, so the next toggle can tell a row
	// in view from a row above the viewport. The item starts include the scroll
	// margin, as the scroll offset does. A row under the sticky head is out of view.
	useLayoutEffect(() => {
		const scroller = scrollRef.current

		const viewTop = (scroller?.scrollTop ?? 0) + offsets.scrollPaddingStart

		snapshot.current = {
			items: new Map(
				win.virtualItems.map((item) => [
					items[item.index]?.key ?? '',
					{ start: item.start, end: item.end },
				]),
			),
			viewTop,
			viewport: scroller?.clientHeight ?? 0,
			list: items,
			firstIndex: win.virtualItems[0]?.index ?? -1,
			anchor: firstInView(win.virtualItems, items, scroller?.scrollTop ?? 0, viewTop),
		}
	})

	// The drop step. Each dropping item goes to 0 pixels under its own key, so
	// its removal in the next commit moves nothing.
	useLayoutEffect(() => {
		if (!dropped) return

		items.forEach((item, index) => {
			if (item.dropping) resizeItem(index, 0)
		})

		dropped()
	}, [items, dropped, resizeItem])

	// A reveal that lands bubbles a `transitionend` to the body. The row that
	// sent it is a direct child of the body, which a nested table in a detail
	// panel is not.
	const revealEndIndex = useCallback((event: TransitionEvent<HTMLElement>): number | null => {
		if (event.propertyName !== REVEAL_PROPERTY) return null

		const row = (event.target as Element).closest('tr')

		if (!row || row.parentElement !== bodyRef.current) return null

		const index = Number(row.getAttribute('data-index'))

		return Number.isInteger(index) ? index : null
	}, [])

	return { bodyRef, revealEndIndex, ...win }
}
