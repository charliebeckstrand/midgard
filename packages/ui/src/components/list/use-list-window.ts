'use client'

import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVirtualWindow } from '../../hooks/use-virtual-window'

/**
 * The first guess at the height of a row, in pixels: a label and one line of
 * description at the default density. Each row measures when it renders, so the
 * guess only places the rows that have not rendered yet.
 *
 * @internal
 */
const ESTIMATED_ROW_HEIGHT = 64

/** Rows the window renders outside the viewport on each side. @internal */
const OVERSCAN = 6

/**
 * Rows drawn while the window holds none: the first this many.
 *
 * @remarks
 * The window is empty until the scroller has measured. That is one commit in a
 * browser, before the paint, and every commit where nothing lays out: a server
 * render, jsdom, or a `display: none` ancestor. The rows from the top stand in
 * for it.
 *
 * @internal
 */
const UNMEASURED_ROWS = 12

/**
 * Where the list sits in its scroller. `scrollMargin` is the distance from the
 * top of the scroll content to the first row, and `gap` is the space between
 * two rows. `null` is a list with no scroll region above it.
 *
 * @internal
 */
type ListFrame = { scrollMargin: number; gap: number } | null

/** The scroll region a windowed list scrolls in: the nearest panel body or other marked scroller. @internal */
function findRegion(list: HTMLElement | null): HTMLElement | null {
	return list?.closest<HTMLElement>('[data-scroll-region]') ?? null
}

/** What {@link useListWindow} hands back to {@link List}. @internal */
export type ListWindow = {
	/**
	 * The indexes of the rows to render, in order, or `null` for every row. Every
	 * row renders when the list is not windowed, and when no scroll region holds
	 * it.
	 */
	indexes: readonly number[] | null
	/** The height of the rows above the window, which the list pads its top with. */
	paddingTop: number
	/** The height of the rows below the window, which the list pads its bottom with. */
	paddingBottom: number
	/** Attach to each rendered row, so the window measures its real height. */
	measureRef: (node: Element | null) => void
}

/**
 * Windows the rows of a read-only vertical {@link List} over its scroll region.
 *
 * The scroller is the nearest ancestor that carries `data-scroll-region`, such
 * as the body of a drawer, a sheet, or a dialog. The list does not own it,
 * because the content above the list scrolls with it. So the hook measures
 * where the list starts in the scroll content, and the flex gap between the
 * rows, which a measured row does not include. A resize of each ancestor of
 * the list, from its parent up to the child of the scroller that holds it,
 * measures again. This covers content above the list that grows or shrinks.
 * A move with no resize of an ancestor is not covered: for example, a sibling
 * above the list grows while a sibling below it shrinks by the same distance,
 * or an ancestor has a fixed height.
 *
 * The padding of the list stands in for the rows outside the window, so the
 * list keeps its full height and a scroller that only a maximum height bounds
 * grows to its cap.
 *
 * @internal
 */
export function useListWindow({
	enabled,
	count,
	getItemKey,
	listRef,
}: {
	enabled: boolean
	count: number
	getItemKey: (index: number) => string | number
	listRef: RefObject<HTMLUListElement | null>
}): ListWindow {
	const [frame, setFrame] = useState<ListFrame>({ scrollMargin: 0, gap: 0 })

	// The guess for a row that has not rendered. The virtualizer reads it through a
	// getter, because a new `estimateSize` takes effect only when a row measures.
	const estimate = useRef(ESTIMATED_ROW_HEIGHT)

	const estimateSize = useCallback(() => estimate.current, [])

	useLayoutEffect(() => {
		const list = listRef.current

		const scroller = findRegion(list)

		if (!enabled || !list) return

		if (!scroller) {
			setFrame(null)

			return
		}

		// The rows that the first commit draws give the guess. This effect runs before
		// the virtualizer computes its first window, so that window holds the rows
		// that the scroller shows, and their measurement does not move it again.
		estimate.current = meanRowHeight(list) ?? estimate.current

		const measure = () => {
			const scrollMargin =
				list.getBoundingClientRect().top -
				scroller.getBoundingClientRect().top -
				scroller.clientTop +
				scroller.scrollTop +
				list.clientTop

			const gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0

			// A change under one pixel moves no row, so it does not render again.
			setFrame((prev) => {
				const same =
					prev !== null && Math.abs(prev.scrollMargin - scrollMargin) < 1 && prev.gap === gap

				return same ? prev : { scrollMargin, gap }
			})
		}

		measure()

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(measure)

		// A ResizeObserver reports a size, not a position. A box above the parent
		// can grow and move the list, so the hook observes each ancestor from the
		// parent up to the child of the scroller that holds the list.
		for (
			let node: HTMLElement | null = list.parentElement ?? list;
			node;
			node = node.parentElement
		) {
			observer.observe(node)

			if (node === scroller || node.parentElement === scroller) break
		}

		return () => observer.disconnect()
	}, [enabled, listRef])

	const windowed = enabled && frame !== null

	const getScrollElement = useCallback(
		() => (windowed ? findRegion(listRef.current) : null),
		[windowed, listRef],
	)

	const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
		count: windowed ? count : 0,
		getScrollElement,
		estimateSize,
		overscan: OVERSCAN,
		scrollMargin: frame?.scrollMargin ?? 0,
		gap: frame?.gap ?? 0,
		getItemKey,
	})

	// The window is a range of indexes. An empty window draws the first rows.
	const first = virtualItems[0]?.index ?? 0

	const last = virtualItems.at(-1)?.index ?? Math.min(count, UNMEASURED_ROWS) - 1

	// One array for each range, so a render that keeps the range lets the list
	// keep its row elements.
	const indexes = useMemo(
		() => Array.from({ length: Math.max(0, last - first + 1) }, (_, at) => first + at),
		[first, last],
	)

	if (!windowed) return { indexes: null, paddingTop: 0, paddingBottom: 0, measureRef }

	// The padding stands in for the rows that the empty window does not draw, so a
	// scroller that only a maximum height bounds is at its cap when the virtualizer
	// first measures it. Without it, the first window fills only the height of the
	// first rows, and the growth of the scroller renders the list again.
	if (virtualItems.length === 0) {
		const rest = Math.max(0, count - indexes.length)

		return {
			indexes,
			paddingTop: 0,
			paddingBottom: rest * (ESTIMATED_ROW_HEIGHT + (frame?.gap ?? 0)),
			measureRef,
		}
	}

	return { indexes, paddingTop: topSpacer, paddingBottom: bottomSpacer, measureRef }
}

/**
 * The mean height in pixels of the rows that the list draws, or `undefined`
 * when it draws no row of some height. @internal
 */
function meanRowHeight(list: HTMLElement): number | undefined {
	let total = 0

	let rows = 0

	for (const row of list.children) {
		const height = (row as HTMLElement).offsetHeight

		if (height > 0) {
			total += height

			rows++
		}
	}

	return rows > 0 ? total / rows : undefined
}
