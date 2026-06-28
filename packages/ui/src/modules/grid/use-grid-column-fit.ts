'use client'

import type { ColumnSizingState, Table } from '@tanstack/react-table'
import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { isDataColumn } from '../../utilities'
import { DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE } from './grid-constants'
import type { GridColumn } from './types'

/** Options for {@link useGridColumnFit}. @internal */
type GridColumnFitOptions<T> = {
	resizable: boolean
	/** When the consumer controls `columnSizing`, auto-fit stands down. */
	controlled: boolean
	table: Table<T>
	columns: GridColumn<T>[]
	/** Element whose width the columns fill (the grid wrapper). */
	containerRef: RefObject<HTMLElement | null> | undefined
}

/**
 * Sizes the data columns to the available width while honoring each column's
 * specified width. That width — the engine size, or the width-less default —
 * clamped to the column's own bounds, is its desired size, and the fit never
 * shrinks a column below it. When the desired widths already fill (or exceed) the
 * available width, the columns hold at those widths and the table overflows
 * horizontally rather than every column squishing down to fit, which truncates
 * content. When there is room to spare, the columns grow proportionally to take
 * it up so the table still spans the container. Non-data columns (select /
 * actions) keep their own size.
 *
 * @internal
 */
function fitSizes<T>(table: Table<T>, columns: GridColumn<T>[], width: number): ColumnSizingState {
	const dataColumns = columns.filter(isDataColumn)

	if (dataColumns.length === 0) return {}

	const fixed = columns
		.filter((col) => !isDataColumn(col))
		.reduce((sum, col) => sum + (table.getColumn(String(col.id))?.getSize() ?? 0), 0)

	// Each data column's desired width, the floor the fit never shrinks past: its
	// specified `width` (the engine size) or the width-less default, clamped to the
	// column's own min/max.
	const bases = dataColumns.map((col) => {
		const def = table.getColumn(String(col.id))?.columnDef

		const min = def?.minSize ?? DEFAULT_MIN_COLUMN_SIZE

		const max = def?.maxSize ?? Number.MAX_SAFE_INTEGER

		return {
			id: String(col.id),
			base: Math.min(Math.max(def?.size ?? DEFAULT_COLUMN_SIZE, min), max),
			max,
		}
	})

	const available = Math.max(0, width - fixed)

	const totalBase = bases.reduce((sum, col) => sum + col.base, 0)

	const sizing: ColumnSizingState = {}

	// Desired widths already fill (or exceed) the space: hold them and let the
	// table scroll horizontally, rather than shrinking below a static width.
	if (totalBase >= available) {
		for (const col of bases) sizing[col.id] = col.base

		return sizing
	}

	// Room to spare: grow each column from its desired width in proportion to it
	// (clamped to its max) so the columns absorb the surplus and the table fills.
	// Carry each column's rounding remainder into the next so the integer widths
	// sum to exactly `available` — rounding the columns independently can leave a
	// pixel or two of slack that pushes the table past the container and raises a
	// phantom horizontal scrollbar.
	const scale = available / totalBase

	let carry = 0

	for (const col of bases) {
		const exact = col.base * scale + carry

		const width = Math.min(Math.round(exact), col.max)

		carry = exact - width

		sizing[col.id] = width
	}

	return sizing
}

/**
 * Auto-sizes resizable columns to the container while honoring their specified
 * widths: each column takes its declared width (or the width-less default), the
 * columns grow proportionally to fill any surplus, and when their widths exceed
 * the container they hold and the table overflows horizontally rather than
 * shrinking to fit (which truncates content) — see {@link fitSizes}. Fits on mount
 * — synchronously, before the browser paints, so the default colgroup never flashes
 * before snapping to fit — and on container resize (via `ResizeObserver`) until
 * the user manually resizes a column, then leaves their widths alone. Returns
 * `sizeToFit`, which re-fits on demand and re-arms the automatic behavior (the
 * "Auto-size columns" action).
 *
 * @internal
 */
export function useGridColumnFit<T>({
	resizable,
	controlled,
	table,
	columns,
	containerRef,
}: GridColumnFitOptions<T>): { sizeToFit: () => void } {
	const enabled = resizable && !controlled

	// Once the user drags a handle, stop auto-fitting so their widths persist.
	const manualRef = useRef(false)

	const resizingColumn = table.getState().columnSizingInfo.isResizingColumn

	useEffect(() => {
		if (resizingColumn) manualRef.current = true
	}, [resizingColumn])

	const applyFit = useCallback(() => {
		// A controlled or non-resizable grid manages its own sizing; the exposed
		// `sizeToFit()` (the header "Auto-size columns" action) must respect that as
		// the automatic ResizeObserver path below already does, rather than write
		// engine sizing the consumer never asked for.
		if (!enabled) return

		const container = containerRef?.current

		const width = container?.clientWidth ?? 0

		if (!width) return

		// Reserve the table's horizontal border chrome — the hairline `outline`
		// borders render the table a pixel or two past the summed column widths
		// (`getTotalSize`), and fitting the columns to the full container width
		// would push that chrome past the scroll edge, raising a phantom horizontal
		// scrollbar. The difference is the chrome (0 without `outline`); subtract it
		// so the rendered table, borders and all, lands exactly on the container.
		const tableEl = container?.querySelector('table')

		const chrome = tableEl
			? Math.max(0, Math.round(tableEl.getBoundingClientRect().width - table.getTotalSize()))
			: 0

		// The resize handle sits inside each column's trailing edge (it no longer
		// overhangs the boundary), so the trailing column needs no extra gutter held
		// back from the scroll edge beyond that border chrome.
		const sizing = fitSizes(table, columns, width - chrome)

		// Bail when the fit changes no width: a ResizeObserver tick from a height-only
		// container resize (or any change that lands on the same px) must not allocate
		// a fresh sizing object, which would re-render the head, body, and footer and
		// re-run the per-cell truncation sweep for nothing. Returning `prev` unchanged
		// lets the state update no-op.
		table.setColumnSizing((prev) => {
			let changed = false

			for (const id in sizing) {
				if (prev[id] !== sizing[id]) {
					changed = true

					break
				}
			}

			return changed ? { ...prev, ...sizing } : prev
		})
	}, [enabled, table, columns, containerRef])

	useLayoutEffect(() => {
		const element = containerRef?.current

		if (!enabled || !element || typeof ResizeObserver === 'undefined') return

		// Fit synchronously, before the browser paints. The colgroup renders at the
		// columns' default widths until the first fit lands, so leaning on the
		// observer's initial callback alone — delivered asynchronously, after paint —
		// flashes that default layout before it snaps to fit. A layout-effect fit
		// lands in the first paint instead. (The observe() below re-fits identically
		// on its initial delivery; same widths, so no visible second paint.)
		if (!manualRef.current) applyFit()

		const observer = new ResizeObserver(() => {
			if (!manualRef.current) applyFit()
		})

		observer.observe(element)

		return () => observer.disconnect()
	}, [enabled, applyFit, containerRef])

	const sizeToFit = useCallback(() => {
		manualRef.current = false

		applyFit()
	}, [applyFit])

	return { sizeToFit }
}
