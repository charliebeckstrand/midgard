'use client'

import type { Table } from '@tanstack/react-table'
import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { DensityLevel } from '../../providers/density/context'
import { allocateColumnWidths } from './grid-column-allocate'
import { type ColumnMeasurement, measureColumnIntrinsics } from './grid-column-measure'
import type { GridColumn } from './types'

/** Options for {@link useGridColumnAutoSize}. @internal */
type GridColumnAutoSizeOptions<T> = {
	resizable: boolean
	/** When the consumer controls `columnSizing`, the autosizer stands down entirely. */
	controlled: boolean
	table: Table<T>
	/** Visible columns in render order. */
	columns: GridColumn<T>[]
	/** Grid wrapper whose width the columns fill (and which holds the rendered cells). */
	containerRef: RefObject<HTMLElement | null> | undefined
	/** Density of the rendered table; a change re-measures (padding and icons scale with it). */
	density: DensityLevel | undefined
}

/** Empty measurement; the resolved value before the first DOM read. @internal */
const EMPTY_MEASUREMENT: ColumnMeasurement = { profiles: [], fixed: 0 }

/**
 * Auto-sizes a resizable grid's data columns to their content within the
 * container width. Each pass measures the columns' intrinsic widths from the
 * rendered DOM (see {@link measureColumnIntrinsics}) and distributes the
 * available width across them (see {@link allocateColumnWidths}): columns size to
 * their content, a column whose data would truncate gains room while columns that
 * don't need it settle at a shared width, and when the content can't fit the
 * table overflows horizontally rather than shrinking below it. A single-word
 * header never truncates; a multi-word one may.
 *
 * Runs synchronously before paint (so the first frame carries real widths, not
 * the engine's default), again on container resize (`ResizeObserver`), when the
 * columns / density / rendered rows change, and once web fonts settle. It stands
 * down when the consumer controls `columnSizing` or the grid is not resizable,
 * and holds a column the user drag-resizes at that width while the rest keep
 * fitting; `sizeToFit` clears those manual holds and re-fits (the "Auto-size
 * columns" action).
 *
 * @internal
 */
export function useGridColumnAutoSize<T>({
	resizable,
	controlled,
	table,
	columns,
	containerRef,
	density,
}: GridColumnAutoSizeOptions<T>): { sizeToFit: () => void } {
	const enabled = resizable && !controlled

	// Columns the user has drag-resized; held at their width while the rest auto-fit.
	const manualPinnedRef = useRef<Set<string>>(new Set())

	// Per-column running-max content width, so a wider row paging/scrolling in only
	// grows a column. Cleared when the column set or density changes (structural).
	const runningContentRef = useRef<Map<string, number>>(new Map())

	// The last measurement, reused when only the container width changes.
	const measurementRef = useRef<ColumnMeasurement>(EMPTY_MEASUREMENT)

	// Signature of the inputs that invalidate a measurement; a change clears the
	// running-max cache and forces a fresh DOM read.
	const structSigRef = useRef<string>('')

	// Rendered rows' fingerprint — count and end ids — so a page turn, filter, or
	// sort that changes the visible rows re-measures (new content may be wider).
	const rowModel = table.getRowModel()

	const rowsSig = `${rowModel.rows.length}:${rowModel.rows[0]?.id ?? ''}:${rowModel.rows.at(-1)?.id ?? ''}`

	const structSig = useMemo(
		() => `${columns.map((col) => String(col.id)).join('')}|${density ?? ''}`,
		[columns, density],
	)

	const run = useCallback(
		(forceMeasure: boolean) => {
			const container = containerRef?.current

			const width = container?.clientWidth ?? 0

			// No layout (jsdom, display:none, a collapsed panel): leave the columns be;
			// the ResizeObserver's first non-zero tick performs the initial fit.
			if (!enabled || !container || !width) return

			// A drag-resize owns the widths while it's in flight; don't fight it.
			if (table.getState().columnSizingInfo.isResizingColumn) return

			const structChanged = structSigRef.current !== structSig

			if (structChanged) {
				runningContentRef.current.clear()

				structSigRef.current = structSig
			}

			if (forceMeasure || structChanged || measurementRef.current.profiles.length === 0) {
				measurementRef.current = measureColumnIntrinsics({
					table,
					columns,
					container,
					manualPinned: manualPinnedRef.current,
					runningContent: runningContentRef.current,
				})
			}

			const { profiles, fixed } = measurementRef.current

			// Reserve the table's horizontal border chrome — hairline `outline` borders
			// render the table a pixel or two past the summed column widths, which would
			// raise a phantom horizontal scrollbar if the columns filled the full width.
			const tableEl = container?.querySelector('table')

			const chrome = tableEl
				? Math.max(0, Math.round(tableEl.getBoundingClientRect().width - table.getTotalSize()))
				: 0

			const sizing = allocateColumnWidths(profiles, width - chrome - fixed)

			// Skip the write when nothing moved: a height-only resize tick (or any change
			// landing on the same pixels) must not allocate a fresh sizing object and
			// re-render the head, body, and footer for nothing.
			table.setColumnSizing((prev) => {
				for (const id in sizing) {
					if (prev[id] !== sizing[id]) return { ...prev, ...sizing }
				}

				return prev
			})
		},
		[enabled, table, columns, containerRef, structSig],
	)

	// Promote a drag-resized column to a manual hold once its drag ends, so the
	// autosizer leaves it alone while the rest keep fitting.
	const resizingColumn = table.getState().columnSizingInfo.isResizingColumn

	const lastResizingRef = useRef<string | false>(false)

	useEffect(() => {
		if (typeof resizingColumn === 'string') {
			lastResizingRef.current = resizingColumn
		} else if (lastResizingRef.current) {
			manualPinnedRef.current.add(lastResizingRef.current)

			lastResizingRef.current = false
		}
	}, [resizingColumn])

	useLayoutEffect(() => {
		const element = containerRef?.current

		if (!enabled || !element || typeof ResizeObserver === 'undefined') return

		// Fit synchronously, before paint, so the first frame carries real widths
		// instead of flashing the engine's default colgroup. (`rowsSig` is read here
		// so a page turn / filter re-runs this effect and re-measures.)
		void rowsSig

		run(true)

		// Width-only changes reuse the cached profiles; the structural-signature check
		// inside `run` re-measures when the columns, density, or rows changed.
		const observer = new ResizeObserver(() => run(false))

		observer.observe(element)

		return () => observer.disconnect()
	}, [enabled, run, containerRef, rowsSig])

	useEffect(() => {
		if (!enabled) return

		// Web fonts reflow text after the first measure; re-measure once they settle.
		document.fonts?.ready
			.then(() => {
				runningContentRef.current.clear()

				run(true)
			})
			.catch(() => {})
	}, [enabled, run])

	const sizeToFit = useCallback(() => {
		manualPinnedRef.current.clear()

		runningContentRef.current.clear()

		run(true)
	}, [run])

	return { sizeToFit }
}
