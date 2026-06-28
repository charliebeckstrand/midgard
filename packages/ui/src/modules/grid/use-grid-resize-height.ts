'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Publishes the span from the header cell's top to the table's bottom as the
 * `--grid-resize-height` CSS variable on the wrapper, so each column's resize
 * handle can run the whole column — header through the last row — instead of
 * just its header cell. The span is measured from the handle's anchor (the
 * header cell's padding-box top) rather than the table's full height, so the
 * handle ends on the table's bottom instead of overrunning it by the cell's top
 * border (see the publish body).
 *
 * The handle stays anchored to its own header cell (inheriting that cell's
 * sticky or pinned positioning); only its height is driven from here, read off
 * the variable that inherits down from the wrapper. A `ResizeObserver` tracks
 * the table so the height follows row, density, and pagination changes. Inert
 * when the grid is not resizable, or where `ResizeObserver` is unavailable
 * (SSR / older runtimes) — the handle then falls back to its header height.
 *
 * @param wrapperRef - The grid's outer wrapper; the variable is written here and
 *   inherits down to every handle. Its single descendant `<table>` is measured.
 * @param resizable - Whether column resizing is on; the observer only runs then.
 * @internal
 */
export function useGridResizeHeight(
	wrapperRef: RefObject<HTMLElement | null>,
	resizable: boolean,
): void {
	useEffect(() => {
		const wrapper = wrapperRef.current

		if (!resizable || !wrapper || typeof ResizeObserver === 'undefined') return

		const table = wrapper.querySelector('table')

		if (!table) return

		const publish = () => {
			// The handle is absolutely positioned at its header cell's `top-0` — the
			// cell's padding-box top, one top-border inside the table, not the table's
			// own top. Publishing the full `offsetHeight` would run the handle that
			// border past the table's bottom (with `outline` borders, ~1px), and since
			// the scroll container's `overflow-x-auto` makes the y-axis scrollable too,
			// that raises a spurious vertical scrollbar on an un-scrolled grid. Span
			// from the header cell's padding-box top to the table's bottom instead.
			const headerCell = table.tHead?.rows[0]?.cells[0]

			const height = headerCell
				? table.getBoundingClientRect().bottom -
					headerCell.getBoundingClientRect().top -
					headerCell.clientTop
				: table.offsetHeight

			wrapper.style.setProperty('--grid-resize-height', `${height}px`)
		}

		publish()

		const observer = new ResizeObserver(publish)

		observer.observe(table)

		return () => {
			observer.disconnect()

			wrapper.style.removeProperty('--grid-resize-height')
		}
	}, [wrapperRef, resizable])
}
