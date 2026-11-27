'use client'

import type { VirtualItem } from '@tanstack/virtual-core'
import {
	type RefObject,
	type TransitionEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import { useVirtualWindow } from '../../hooks/use-virtual-window'
import { transitionLanded } from '../../utilities/transition-landed'
import { FIRST_WINDOW_RECT } from './engine/grid-constants'
import { windowItemEstimate } from './engine/grid-items/items'
import { useGridFitRenderedRows } from './use-grid-fit-rendered-rows'
import type { GridScrollRowIntoView } from './use-grid-navigation'
import { REVEAL_PROPERTY } from './use-grid-reveal-hold'
import { useGridWindowKeep } from './use-grid-window-keep'
import { useGridWindowOffsets } from './use-grid-window-offsets'

/**
 * The window wiring that the grid passes to a windowed body.
 *
 * @internal
 */
export type GridItemWindowOptions = {
	scrollRef: RefObject<HTMLDivElement | null>
	/**
	 * The row height: the consumer's `estimateSize`, else the measured row (see
	 * `useGridRowHeight`), else a first guess until a row measures. The window
	 * uses it as the first guess for each row that is not closing.
	 */
	estimateSize: number
	overscan: number
	/**
	 * Re-fits the columns once the window's rows render, for the fit that had no
	 * rows to measure (see `useGridColumnSizing`). Called from a layout effect, so
	 * the widths land before those rows paint; a no-op once a fit has read rows.
	 */
	fitRenderedRows: () => void
	/** Whether the header sticks, so the window aligns a row below it. */
	stickyHeader: boolean
	/** The cursor's row scroller. The body sets it while it is mounted, so the cursor can reach a row outside the window. */
	scrollIntoViewRef?: RefObject<GridScrollRowIntoView | null>
}

/** The part of a window item that the window reads. @internal */
type WindowItem = { key: string; size?: number; phase?: 'open' | 'closing' }

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
type GridItemEdge = 'above' | 'top' | 'in' | 'below'

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

	// The first rendered item that ends below the top edge. An item outside the
	// window before it is above the view. A kept row above the window ends above
	// the edge, so the rows between it and the window are above the view too.
	const first =
		(record.virtualItems.find((virtualItem) => virtualItem.end > top) ?? record.virtualItems[0])
			?.index ?? -1

	let rendered: Map<string, VirtualItem> | null = null

	let indexByKey: Map<string, number> | null = null

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

			indexByKey ??= new Map(record.items.map((listItem, index) => [listItem.key, index]))

			const index = indexByKey.get(key)

			if (index === undefined || first < 0) return undefined

			return index < first ? 'above' : 'below'
		},
	}
}

/**
 * Drives the measured window of a grouped or master-detail body over its item
 * list. It returns the body ref, the rendered items, the two spacer heights,
 * the measure ref that each rendered row attaches, and the reveal-end reader.
 * After each commit it writes the window to `recordRef`.
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
 * The window keeps the row of the cursor and the row that holds focus mounted
 * out of view (see {@link useGridWindowKeep}). The body names each item by its
 * key, and each row carries its index as `data-index`. The body passes the
 * returned `onFocus` and `onBlur` to its `<tbody>`.
 *
 * The scroller of a windowed master-detail or grouped body has
 * `overflow-anchor: none` (see `k.sticky.wrapper.windowed`), so the start anchor is
 * the only correction. The native scroll anchoring of the browser can keep a
 * stale correction after a clamp at the scroll end. A panel that opens there
 * then moves the rows in view by its height.
 *
 * @internal
 */
export function useGridItemWindow<I extends WindowItem>(
	items: readonly I[],
	options: GridItemWindowOptions,
	recordRef: RefObject<GridWindowRecord>,
) {
	const { scrollRef, estimateSize, overscan, fitRenderedRows, stickyHeader } = options

	const bodyRef = useRef<HTMLTableSectionElement>(null)

	const getScrollElement = useCallback(() => scrollRef.current, [scrollRef])

	const offsets = useGridWindowOffsets(bodyRef, scrollRef, stickyHeader)

	// Each new item list gives a new key getter and a new estimate. The
	// virtualizer then rebuilds the row positions, which a new list needs.
	const getItemKey = useCallback((index: number) => items[index]?.key ?? index, [items])

	const estimate = useCallback(
		(index: number) => windowItemEstimate(items[index] ?? {}, estimateSize),
		[items, estimateSize],
	)

	const indexByKey = useMemo(
		() => new Map<string | number, number>(items.map((item, index) => [item.key, index])),
		[items],
	)

	const { keep, onFocus, onBlur } = useGridWindowKeep({
		indexAttribute: 'data-index',
		toKey: (index) => items[index]?.key,
		findIndex: (key) => indexByKey.get(key) ?? -1,
	})

	const virtualWindow = useVirtualWindow({
		count: items.length,
		getScrollElement,
		estimateSize: estimate,
		overscan,
		...offsets,
		getItemKey,
		initialRect: FIRST_WINDOW_RECT,
		keep,
	})

	// The autosizer fits the columns again once the window's rows render.
	useGridFitRenderedRows(virtualWindow.virtualItems.length, fitRenderedRows)

	// Each commit records its window by reference. A toggle reads it later
	// through `gridWindowView`, so a commit with no toggle reads nothing.
	useLayoutEffect(() => {
		recordRef.current = {
			virtualItems: virtualWindow.virtualItems,
			items,
			paddingStart: offsets.scrollPaddingStart,
		}
	})

	// A reveal that lands bubbles a `transitionend` to the body, or a
	// `transitioncancel` when an ancestor's `display: none` interrupts it. A
	// cancel from a toggle in flight is not a landing, since the reversed reveal
	// still runs (`transitionLanded`). The row that sent it is a direct child of
	// the body, which a nested table in a detail panel is not. Only a closing row
	// has work to do when its reveal lands: the body releases it.
	const closingEndItem = useCallback(
		(event: TransitionEvent<HTMLElement>): I | undefined => {
			// React builds a `transitioncancel` with no `propertyName` of its own.
			if (event.nativeEvent.propertyName !== REVEAL_PROPERTY) return undefined

			if (!transitionLanded(event.nativeEvent)) return undefined

			const row = (event.target as Element).closest('tr')

			if (!row || row.parentElement !== bodyRef.current) return undefined

			const item = items[Number(row.getAttribute('data-index'))]

			return item?.phase === 'closing' ? item : undefined
		},
		[items],
	)

	// The cursor names an item by its key. While this body is mounted, it scrolls
	// the item with that key into the window before the cursor points at it.
	const { scrollIntoViewRef } = options

	const { scrollToIndex } = virtualWindow

	useEffect(() => {
		if (!scrollIntoViewRef) return

		scrollIntoViewRef.current = (_, key) => {
			const index = recordRef.current.items.findIndex((item) => item.key === key)

			if (index >= 0) scrollToIndex(index, { align: 'auto' })
		}

		return () => {
			scrollIntoViewRef.current = null
		}
	}, [scrollIntoViewRef, scrollToIndex, recordRef])

	return { bodyRef, closingEndItem, onFocus, onBlur, ...virtualWindow }
}
