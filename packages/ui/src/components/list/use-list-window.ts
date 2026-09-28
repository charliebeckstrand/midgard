'use client'

import { type RefObject, useCallback, useLayoutEffect, useState } from 'react'
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
function scrollRegionOf(list: HTMLElement | null): HTMLElement | null {
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
 * rows, which a measured row does not include. A resize of the parent of the
 * list measures again, which covers content above the list that grows or
 * shrinks.
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

	useLayoutEffect(() => {
		const list = listRef.current

		const scroller = scrollRegionOf(list)

		if (!enabled || !list) return

		if (!scroller) {
			setFrame(null)

			return
		}

		const measure = () => {
			const scrollMargin =
				list.getBoundingClientRect().top -
				scroller.getBoundingClientRect().top -
				scroller.clientTop +
				scroller.scrollTop +
				list.clientTop

			const gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0

			// A change under one pixel moves no row, so it does not render again.
			setFrame((current) =>
				current !== null && Math.abs(current.scrollMargin - scrollMargin) < 1 && current.gap === gap
					? current
					: { scrollMargin, gap },
			)
		}

		measure()

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(measure)

		observer.observe(list.parentElement ?? list)

		return () => observer.disconnect()
	}, [enabled, listRef])

	const windowed = enabled && frame !== null

	const getScrollElement = useCallback(
		() => (windowed ? scrollRegionOf(listRef.current) : null),
		[windowed, listRef],
	)

	const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
		count: windowed ? count : 0,
		getScrollElement,
		estimateSize: ESTIMATED_ROW_HEIGHT,
		overscan: OVERSCAN,
		scrollMargin: frame?.scrollMargin ?? 0,
		gap: frame?.gap ?? 0,
		getItemKey,
	})

	if (!windowed) return { indexes: null, paddingTop: 0, paddingBottom: 0, measureRef }

	if (virtualItems.length === 0) {
		return {
			indexes: Array.from({ length: Math.min(count, UNMEASURED_ROWS) }, (_, index) => index),
			paddingTop: 0,
			paddingBottom: 0,
			measureRef,
		}
	}

	return {
		indexes: virtualItems.map((item) => item.index),
		paddingTop: topSpacer,
		paddingBottom: bottomSpacer,
		measureRef,
	}
}
