'use client'

import { type RefCallback, useEffect } from 'react'
import { useTruncation } from '../../hooks/use-truncation'

/**
 * A subscription to the settle of one column: it calls `listener` each time the
 * settled width of the column changes, and returns the unsubscribe.
 *
 * @internal
 */
export type GridSettleSubscription = (listener: () => void) => () => void

/**
 * Grid truncation tracking: {@link useTruncation}'s eager overflow measure, plus
 * a resize-settle re-measure. A column resize can move a cell's width through
 * the `<colgroup>` alone, and no cell renders again. The settle re-measure
 * reads the overflow again there.
 *
 * Shared by the data-cell ({@link GridCellContent}) and column-header
 * (`GridHeaderTitle`) truncation surfaces.
 *
 * @param onSettle - A subscription to the settle of the cell's column (see
 * `GridSettleStore`). A visited cell subscribes, and measures when its column
 * settles. It measures at once, and again on the next frame, in case the layout
 * settled after the synchronous read. A cell with no contact does not subscribe,
 * because it keeps no live `truncated` flag. The header omits it — it already
 * renders again on its own `width` prop.
 * @param suspended - Stands the measure down entirely (a drag-resize in flight,
 * whose reveal the cell holds closed anyway). A flag re-measures on the first
 * commit after it lifts. A body cell passes a function instead, read at each
 * measure. The settle at the end of the drag then measures it again.
 * @returns `[ref, truncated, contacted]`. Attach `ref` to the single-line
 * element. Read `truncated` to gate the reveal tooltip. Read `contacted` to
 * defer mounting the reveal machinery until the first contact that could open
 * it.
 * @internal
 */
export function useGridTruncation<E extends HTMLElement>(
	onSettle?: GridSettleSubscription,
	suspended?: boolean | (() => boolean),
): [RefCallback<E>, boolean, boolean] {
	const [ref, truncated, measure, contacted] = useTruncation<E>({ suspended })

	// Only a visited cell has a live `truncated` flag to keep current; before
	// contact `measure` bails. A subscription for each cell of a wide, un-windowed
	// grid would add the mass-truncation cost that this re-measure must not add,
	// so the first contact subscribes. The frame is a no-op where
	// `requestAnimationFrame` is absent (SSR / jsdom).
	useEffect(() => {
		if (!contacted || !onSettle) return

		let frame = 0

		const unsubscribe = onSettle(() => {
			measure()

			if (typeof requestAnimationFrame !== 'function') return

			cancelAnimationFrame(frame)

			frame = requestAnimationFrame(measure)
		})

		return () => {
			unsubscribe()

			if (frame !== 0) cancelAnimationFrame(frame)
		}
	}, [contacted, onSettle, measure])

	return [ref, truncated, contacted]
}
