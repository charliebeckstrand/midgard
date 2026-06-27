'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Publishes the grid table's full height as the `--grid-resize-height` CSS
 * variable on the wrapper, so each column's resize handle can span the whole
 * column — header through the last row — instead of just its header cell.
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
			wrapper.style.setProperty('--grid-resize-height', `${table.offsetHeight}px`)
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
