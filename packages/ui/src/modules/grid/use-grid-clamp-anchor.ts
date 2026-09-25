'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Clears the native scroll anchor of the grid scroller after a clamp at the
 * scroll end.
 *
 * @remarks
 * A flat master-detail or grouped body keeps `overflow-anchor: auto`, which is
 * the default. The native anchor holds a row in view when a detail panel or the
 * leaves of a group open or close above the viewport. The `<colgroup>` of a
 * resizable grid skips the anchor (see `k.resize.colgroup`), so the anchor is a
 * body row in both modes.
 *
 * A panel or a group that closes at the scroll end shrinks the content, and
 * the browser clamps the scroll offset down. Chromium keeps its anchor through
 * a clamp. The anchor then holds a correction equal to the clamp, which the
 * scroll end blocks. The next row that opens adds height, and the correction
 * goes through. The rows in view then move up by the height that closed.
 *
 * Only a change of the scroll offset clears the anchor. A write of the same
 * offset does not, and a change of `overflow-anchor` does not. So a `scroll`
 * event that shows a clamp moves the offset back by one pixel and then forward
 * again. The two writes occur in one task, so no frame paints the step. At the
 * next layout, Chromium selects a new anchor from the rows in view.
 *
 * A `scroll` event shows a clamp when the offset decreases to the scroll end. A
 * scroll by the user cannot decrease to the end, because the end is the largest
 * offset.
 *
 * @param scrollRef - The grid scroller.
 * @param active - Whether the scroller holds a flat master-detail or grouped body.
 * @internal
 */
export function useGridClampAnchor(
	scrollRef: RefObject<HTMLElement | null>,
	active: boolean,
): void {
	useEffect(() => {
		const scroller = scrollRef.current

		if (!active || !scroller) return

		let last = scroller.scrollTop

		const onScroll = () => {
			const top = scroller.scrollTop

			// At the offset zero, Chromium keeps no anchor.
			if (top < last && top >= 1 && scroller.scrollHeight - scroller.clientHeight - top < 1) {
				scroller.scrollTop = top - 1

				scroller.scrollTop = top
			}

			last = scroller.scrollTop
		}

		scroller.addEventListener('scroll', onScroll, { passive: true })

		return () => scroller.removeEventListener('scroll', onScroll)
	}, [scrollRef, active])
}
