'use client'

import type { Table } from '@tanstack/react-table'
import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { columnPinSide } from './engine/grid-pin/layout'
import {
	type FrozenCell,
	type FrozenOffsets,
	frozenHeaderCells,
	frozenOffsets,
	sameFrozenOffsets,
} from './engine/grid-pin/measure'
import type { GridColumn } from './types'

/** Options for {@link useGridPinnedOffsets}. @internal */
type GridPinnedOffsetsOptions<T> = {
	/** Whether any column is frozen at all; nothing else has an offset to measure. */
	frozen: boolean
	/**
	 * Whether the engine's size model sets the rendered column widths — a resizable
	 * grid, which lays out fixed from a `<colgroup>` of those sizes. Its own offset
	 * sums are then already exact, so the measurement stands down.
	 */
	engineSized: boolean
	table: Table<T>
	/** Visible columns in render order — one rendered header cell each. */
	columns: GridColumn<T>[]
	/** Grid wrapper holding the rendered header. */
	containerRef: RefObject<HTMLElement | null> | undefined
}

/**
 * Measures the frozen columns' sticky offsets from the rendered header, so a
 * stack of pinned and/or locked columns sits flush.
 *
 * A frozen column sticks at the summed width of the frozen columns ahead of it.
 * The engine can supply that sum only while it also sets the widths — which it
 * does through the fixed-layout `<colgroup>` of a resizable grid, and not at all
 * under the auto layout of a non-resizable one, where each column takes its
 * content's width. Summing the engine's sizes there spreads the frozen columns
 * apart by the difference, and the scrolling columns show through the gaps; this
 * reads the rendered widths instead.
 *
 * Measures before paint on mount, and again whenever a frozen header cell
 * changes width — a container resize, new content, a density change, or web
 * fonts settling all reach the offsets only through that width, so observing the
 * cells covers each of them without a trigger apiece. The result holds its
 * reference while the pixels are unchanged, so a re-measure that moved nothing
 * re-renders neither the header nor a row. `null` until the first measurement
 * (and whenever disabled), which leaves the engine's sums in place.
 *
 * @internal
 */
export function useGridPinnedOffsets<T>({
	frozen,
	engineSized,
	table,
	columns,
	containerRef,
}: GridPinnedOffsetsOptions<T>): FrozenOffsets | null {
	const enabled = frozen && !engineSized

	const [offsets, setOffsets] = useState<FrozenOffsets | null>(null)

	// The published measurement, so the observer can compare against it without
	// re-arming on every offsets change.
	const publishedRef = useRef<FrozenOffsets | null>(null)

	const cells = useCallback(() => {
		const container = containerRef?.current

		if (!enabled || !container) return []

		return frozenHeaderCells(container, columns, (id) => columnPinSide(table, id))
	}, [enabled, table, columns, containerRef])

	const publish = useCallback((scan: FrozenCell[]) => {
		// No frozen cell resolved: the header hasn't rendered, or its row is mid column
		// change. Hold the last measurement rather than dropping back to the engine's
		// sums, which would jump the frozen columns for a frame.
		if (scan.length === 0) return

		const next = frozenOffsets(scan)

		if (sameFrozenOffsets(publishedRef.current, next)) return

		publishedRef.current = next

		setOffsets(next)
	}, [])

	useLayoutEffect(() => {
		if (!enabled) return

		// One scan serves both the measurement and the observer: measure synchronously,
		// before paint, so the first frame carries the rendered offsets rather than the
		// engine's, then observe the very cells it just read.
		const scan = cells()

		publish(scan)

		if (typeof ResizeObserver === 'undefined') return

		// A frozen column's width is the only input to the offsets, so observing the
		// frozen header cells is the whole trigger set. Each tick re-scans, since a
		// column change can have replaced the cells since this ran.
		const observer = new ResizeObserver(() => publish(cells()))

		for (const { cell } of scan) observer.observe(cell)

		return () => observer.disconnect()
	}, [enabled, publish, cells])

	// Gated on the way out rather than cleared in the effect above, so a grid that
	// releases its last frozen column (or turns resizable) falls back to the engine
	// in the same render, not a frame later.
	return enabled ? offsets : null
}
