'use client'

import { type RefCallback, useCallback, useState } from 'react'

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
 * @returns `rowHeight`, the height in pixels, or `null` until a row measures.
 * `measureRef` goes on the grid's `<table>`.
 * @remarks The stepped classes of the table set the row height, so no number in
 * code copies them. While `rowHeight` is `null`, the body holds the loading
 * skeleton. The ref reads a placeholder row when the table attaches, which is in
 * the commit, before the first client paint. A `ResizeObserver` on the table
 * reads the first row again when the table changes size: a data row replaces
 * the skeleton, a density change moves the row height, or a hidden panel shows
 * the grid. A row that measures zero, such as in a `display: none` panel, sets
 * nothing.
 * @internal
 */
export function useGridRowHeight(enabled: boolean): {
	rowHeight: number | null
	measureRef: RefCallback<HTMLTableElement>
} {
	const [rowHeight, setRowHeight] = useState<number | null>(null)

	const measureRef = useCallback(
		(table: HTMLTableElement | null) => {
			if (!enabled || !table) return

			// The last height set, so a resize that leaves the row as it was
			// schedules no render of the grid.
			let last = 0

			const read = () => {
				const height = table.querySelector<HTMLElement>(ROW_SELECTOR)?.offsetHeight ?? 0

				if (height <= 0 || height === last) return

				last = height

				setRowHeight(height)
			}

			read()

			const observer = new ResizeObserver(read)

			observer.observe(table)

			return () => observer.disconnect()
		},
		[enabled],
	)

	return { rowHeight: enabled ? rowHeight : null, measureRef }
}
