'use client'

import { useLayoutEffect } from 'react'

/**
 * Tells the column autosizer that a window's rows rendered, so the fit that
 * had no rows to measure runs again.
 *
 * @remarks A windowed body renders its rows a commit or two after the rows
 * arrive. The virtualizer re-attaches to its scroll element only once the refs
 * are in place (see `useVirtualWindow`). A grid whose rows arrive after mount
 * therefore fits against an empty body first. The fit runs from a layout
 * effect, before the window paints, so the first frame of the rows carries
 * content widths, not the floor-only fit. A new count of rendered rows runs it
 * again.
 *
 * @param renderedCount - The count of rows that the window renders.
 * @param fitRenderedRows - The autosizer's re-fit for a count of rendered rows,
 * a no-op once a fit has read rows or while the window has none.
 * @internal
 */
export function useGridFitRenderedRows(
	renderedCount: number,
	fitRenderedRows: (renderedCount: number) => void,
): void {
	useLayoutEffect(() => {
		fitRenderedRows(renderedCount)
	}, [renderedCount, fitRenderedRows])
}
