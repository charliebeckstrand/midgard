'use client'

import type { VirtualItem } from '@tanstack/react-virtual'
import {
	type RefObject,
	type TransitionEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
} from 'react'
import { useVirtualWindow } from '../../hooks'
import { windowItemEstimate } from './engine/grid-items/items'
import type { GridScrollRowIntoView } from './grid-virtualized-body'
import { useGridFitRenderedRows } from './use-grid-fit-rendered-rows'
import { REVEAL_PROPERTY } from './use-grid-reveal-hold'
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
	/** The cursor's row scroller, which the body sets while it is mounted. */
	scrollIntoViewRef?: RefObject<GridScrollRowIntoView | null>
}

/** The part of a window item that the window reads. @internal */
type WindowItem = { key: string; kind: string; size?: number }

/**
 * What each commit records of its window: the rendered items, the item list,
 * and the height of the sticky head. A commit writes only these references.
 * {@link gridWindowView} reads them when a toggle needs them. @internal
 */
export type GridWindowRecord = {
	virtualItems: readonly VirtualItem[]
	items: readonly { key: string }[]
	paddingStart: number
}

/** The record before the first commit, which holds no rendered item. @internal */
export const NO_WINDOW_RECORD: GridWindowRecord = { virtualItems: [], items: [], paddingStart: 0 }

/**
 * Where an item sat in the last commit, against the top edge of the part of
 * the scroller that the reader sees. That edge is the scroll offset plus the
 * sticky head, which covers the rows under it.
 *
 * - `above` ends at or above the top edge. An item outside the window before
 *   its first row is above too.
 * - `top` crosses the top edge.
 * - `in` starts at or below the top edge.
 * - `below` is outside the window after its last row.
 *
 * @internal
 */
export type GridItemEdge = 'above' | 'top' | 'in' | 'below'

/**
 * The last committed window as a toggle reads it. It gives the edge of an
 * item, the height of a rendered item, and the height of the viewport. @internal
 */
export type GridWindowView = {
	edge: (key: string) => GridItemEdge | undefined
	size: (key: string) => number | undefined
	viewport: number
}

/**
 * Builds the {@link GridWindowView} of a record. It reads the scroll offset
 * and the viewport height from the scroller once. It indexes the item list
 * only when an item outside the window asks for its edge.
 *
 * @internal
 */
export function gridWindowView(
	record: GridWindowRecord,
	scroller: HTMLElement | null,
): GridWindowView {
	const top = (scroller?.scrollTop ?? 0) + record.paddingStart

	const first = record.virtualItems[0]?.index ?? -1

	let rendered: Map<string, VirtualItem> | null = null

	let indexOf: Map<string, number> | null = null

	const item = (key: string) => {
		rendered ??= new Map(
			record.virtualItems.map((virtualItem) => [String(virtualItem.key), virtualItem]),
		)

		return rendered.get(key)
	}

	return {
		viewport: scroller?.clientHeight ?? 0,
		size: (key) => item(key)?.size,
		edge: (key) => {
			const virtualItem = item(key)

			if (virtualItem) {
				if (virtualItem.end <= top) return 'above'

				return virtualItem.start < top ? 'top' : 'in'
			}

			indexOf ??= new Map(record.items.map((listItem, index) => [listItem.key, index]))

			const index = indexOf.get(key)

			if (index === undefined || first < 0) return undefined

			return index < first ? 'above' : 'below'
		},
	}
}

/**
 * Drives the measured window of a grouped or master-detail body over its item
 * list. It returns the body ref, the rendered items, the two spacer heights,
 * the measure ref that each rendered row attaches, and the reveal-end reader.
 * After each commit it writes the window to `record`.
 *
 * @remarks Each item has a prefixed key, and the virtualizer caches each
 * measured height against it. The first guess comes from
 * {@link windowItemEstimate}. The scroll margin and the paddings come from
 * {@link useGridWindowOffsets}, and the columns fit again through
 * {@link useGridFitRenderedRows}, as on the flat windowed body.
 *
 * An insert or a removal above the first row in view does not move that row.
 * The start anchor of `useVirtualWindow` holds it still.
 *
 * While the window is mounted, the scroller has `overflow-anchor: none`, so
 * the start anchor is the only correction. The native scroll anchoring of the
 * browser can keep a stale correction after a clamp at the scroll end. A panel
 * that opens there then moves the rows in view by its height.
 *
 * @internal
 */
export function useGridItemWindow<I extends WindowItem>(
	items: readonly I[],
	options: GridItemWindowOptions,
	record: RefObject<GridWindowRecord>,
) {
	const { scrollRef, estimateSize, overscan, fitRenderedRows, stickyHeader } = options

	const bodyRef = useRef<HTMLTableSectionElement>(null)

	const getScrollElement = useCallback(() => scrollRef.current, [scrollRef])

	const offsets = useGridWindowOffsets(bodyRef, scrollRef, stickyHeader)

	// The start anchor holds the rows in view, so the native anchor of the
	// scroller stands down while this window is mounted. A clamp at the scroll
	// end does not clear the native anchor. It then keeps a correction that the
	// end blocks, and the next item that grows releases it.
	useLayoutEffect(() => {
		const scroller =
			scrollRef.current ?? bodyRef.current?.closest<HTMLElement>('[data-slot="grid-scroll"]')

		if (!scroller) return

		const previous = scroller.style.overflowAnchor

		scroller.style.overflowAnchor = 'none'

		return () => {
			scroller.style.overflowAnchor = previous
		}
	}, [scrollRef])

	// Each new item list gives a new key getter and a new estimate. The
	// virtualizer then rebuilds the row positions, which a new list needs.
	const getItemKey = useCallback((index: number) => items[index]?.key ?? index, [items])

	const estimate = useCallback(
		(index: number) => windowItemEstimate(items[index] ?? { kind: '' }, estimateSize),
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

	// The autosizer fits the columns again once the window's rows render.
	useGridFitRenderedRows(win.virtualItems.length, fitRenderedRows)

	// Each commit records its window by reference. A toggle reads it later
	// through `gridWindowView`, so a commit with no toggle reads nothing.
	useLayoutEffect(() => {
		record.current = {
			virtualItems: win.virtualItems,
			items,
			paddingStart: offsets.scrollPaddingStart,
		}
	})

	// A reveal that lands bubbles a `transitionend` to the body. The row that
	// sent it is a direct child of the body, which a nested table in a detail
	// panel is not.
	const revealEndItem = useCallback(
		(event: TransitionEvent<HTMLElement>): I | undefined => {
			if (event.propertyName !== REVEAL_PROPERTY) return undefined

			const row = (event.target as Element).closest('tr')

			if (!row || row.parentElement !== bodyRef.current) return undefined

			return items[Number(row.getAttribute('data-index'))]
		},
		[items],
	)

	// The cursor names an item by its key. While this body is mounted, it scrolls
	// the item with that key into the window before the cursor points at it.
	const { scrollIntoViewRef } = options

	const { scrollToIndex } = win

	useEffect(() => {
		if (!scrollIntoViewRef) return

		scrollIntoViewRef.current = (_, key) => {
			const index = record.current.items.findIndex((item) => item.key === key)

			if (index >= 0) scrollToIndex(index, { align: 'auto' })
		}

		return () => {
			scrollIntoViewRef.current = null
		}
	}, [scrollIntoViewRef, scrollToIndex, record])

	return { bodyRef, revealEndItem, ...win }
}
