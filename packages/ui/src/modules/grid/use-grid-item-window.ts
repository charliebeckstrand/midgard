'use client'

import { type RefObject, type TransitionEvent, useCallback, useLayoutEffect, useRef } from 'react'
import { useVirtualWindow } from '../../hooks'
import { windowItemEstimate } from './engine/grid-items/items'
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

/** The part of a window item that the window reads. @internal */
type WindowItem = { key: string; kind: string }

/**
 * The rendered window as the last commit left it. It holds the start and end
 * of each rendered item by key, the scroll offset, and the viewport height. A body
 * reads it during the render that a toggle starts, to find which rows the user
 * can see. @internal
 */
export type GridWindowSnapshot = {
	items: ReadonlyMap<string, { start: number; end: number }>
	scrollTop: number
	viewport: number
}

/** The snapshot before the first commit, which holds no rendered item. @internal */
export const NO_WINDOW_SNAPSHOT: GridWindowSnapshot = {
	items: new Map(),
	scrollTop: 0,
	viewport: 0,
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
 * @internal
 */
export function useGridItemWindow(
	items: readonly WindowItem[],
	options: GridItemWindowOptions,
	snapshot: RefObject<GridWindowSnapshot>,
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

	// Each commit records the rendered window, so the next toggle can tell a row
	// in view from a row above the viewport. The item starts include the scroll
	// margin, as the scroll offset does.
	useLayoutEffect(() => {
		const scroller = scrollRef.current

		snapshot.current = {
			items: new Map(
				win.virtualItems.map((item) => [
					items[item.index]?.key ?? '',
					{ start: item.start, end: item.end },
				]),
			),
			scrollTop: scroller?.scrollTop ?? 0,
			viewport: scroller?.clientHeight ?? 0,
		}
	})

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
