'use client'

import { type RefCallback, useCallback, useState } from 'react'
import type { DensityStep } from '../../core/density'

/**
 * The rows that give the height: a data row, or a placeholder row of the
 * loading skeleton. Only the rows of the grid's own body match, and not the
 * rows of a table in a detail panel.
 */
const ROW_SELECTOR =
	':scope > tbody > tr[data-grid-row], :scope > tbody > tr[data-grid-placeholder]'

/**
 * The measured height of one grid row, which is the row estimate of a windowed
 * grid.
 *
 * @param enabled - Whether the grid windows its rows and the consumer gave no
 * `estimateSize`. When it is false, the hook measures nothing.
 * @param density - The density the rows paint at. A new value measures again.
 * @returns `rowHeight`, the height in pixels, or `null` until a row measures.
 * `measureRef` goes on the grid's `<table>`.
 * @remarks The stepped classes of the table set the row height, so no number in
 * code copies them. While `rowHeight` is `null`, the body holds the loading
 * skeleton. The ref reads a placeholder row when the table attaches, which is in
 * the commit, before the first client paint.
 *
 * A row that measures zero, such as in a `display: none` panel, sets nothing. A
 * `ResizeObserver` on the table then waits for the first row that has a height,
 * and stops. It does not stay on, because a row of a grouped or a detail body
 * changes height while its reveal plays, and that height is not the row height.
 *
 * A new `density` keeps the last height as the estimate, and the new ref reads a
 * row of the window in the same commit. The height of the new density follows
 * one commit later. The window stays mounted, so the reader keeps the scroll
 * position and each row keeps its node. Only the first measure holds the
 * skeleton. The measured bodies measure each row themselves, so for them the
 * estimate is only a first guess.
 * @internal
 */
export function useGridRowHeight(
	enabled: boolean,
	density: DensityStep,
): {
	rowHeight: number | null
	measureRef: RefCallback<HTMLTableElement>
} {
	const [measured, setMeasured] = useState<{ density: DensityStep; height: number } | null>(null)

	const measureRef = useCallback(
		(table: HTMLTableElement | null) => {
			if (!enabled || !table) return

			/** Sets the height of the first row, and returns whether it had one. */
			const read = () => {
				const height = table.querySelector<HTMLElement>(ROW_SELECTOR)?.offsetHeight ?? 0

				if (height <= 0) return false

				setMeasured({ density, height })

				return true
			}

			if (read()) return

			const observer = new ResizeObserver(() => {
				if (read()) observer.disconnect()
			})

			observer.observe(table)

			return () => observer.disconnect()
		},
		[enabled, density],
	)

	const rowHeight = enabled && measured ? measured.height : null

	return { rowHeight, measureRef }
}
