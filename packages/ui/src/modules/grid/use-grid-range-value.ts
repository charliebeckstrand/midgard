'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useControlledLatch } from '../../hooks/use-controlled-latch'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { GridRangeCells } from './engine/grid-range/range'
import type { GridRange, GridRangeState } from './grid-data-types'
import type { GridCellRef } from './grid-editing-types'
import type { GridColumn } from './types'
import type { Coord, useGridNavigation } from './use-grid-navigation'

/**
 * The parts of the cursor that the value of the range reads and writes. The
 * read-only cursor and the editing cursor give the same handle. @internal
 */
export type GridRangeHandle = {
	/** The anchor of the range, reactive. */
	anchor: Coord | null
	/** The cursor as a place in its order, reactive. */
	focus: Coord | null
	/** The cells of the range at call time, or `null` for no range. */
	readRange: () => GridRangeCells | null
	/** Makes the range between two data cells, and moves the cursor to the second. */
	selectRange: (from: Coord, to: Coord) => boolean
	/** Ends the range, and keeps the cursor where it is. */
	endRange: () => void
}

/** The range handle of a cursor's navigation. @internal */
export function gridRangeHandle(nav: ReturnType<typeof useGridNavigation>): GridRangeHandle {
	return {
		anchor: nav.rangeAnchor,
		focus: nav.rangeFocus,
		readRange: nav.readRange,
		selectRange: nav.selectRange,
		endRange: nav.endRange,
	}
}

/** Whether two cells are the same cell. */
function sameCell(a: GridCellRef, b: GridCellRef): boolean {
	return a.rowKey === b.rowKey && a.columnId === b.columnId
}

/** Whether two values of the range name the same cells. @internal */
export function sameRange(a: GridRangeState | null, b: GridRangeState | null): boolean {
	if (a === null || b === null) return a === b

	return sameCell(a.anchor, b.anchor) && sameCell(a.focus, b.focus)
}

/**
 * The row of the focus of a range. While the cursor is on a row that holds no
 * data, the focus is the data row of the range at the cursor's edge: the last
 * row when the anchor is at the top, else the first. @internal
 */
export function focusRow(cells: GridRangeCells): number | undefined {
	if (cells.to.row !== -1) return cells.to.row

	return cells.rows[0] === cells.from.row ? cells.rows.at(-1) : cells.rows[0]
}

/**
 * Binds {@link GridDataProps.range} to the cursor. It reports each change of
 * the range by the row key and the column id, and it shows the value of a
 * controlled binding. A controlled grid holds the range on screen as state, so
 * a report renders again also when the owner does not take it. That render
 * then shows the value of the owner again.
 *
 * @remarks The grid calls it after the layout effect that follows the cursor
 * into a new layout. A value that comes with a sort thus names the cells of the
 * sorted rows, and the end of the old range comes first.
 *
 * @internal
 */
export function useGridRangeValue<T>({
	binding,
	handle,
	rowKeys,
	columns,
}: {
	binding: GridRange | undefined
	handle: GridRangeHandle
	/** The keys of the rows of the cursor, in display order. */
	rowKeys: readonly (string | number)[]
	/** The columns of the cursor, in display order. */
	columns: readonly GridColumn<T>[]
}): void {
	const value = binding?.value

	const controlled = useControlledLatch(value)

	// The range on screen as the grid last reported it or showed it. The report
	// reads it at event time, so a range that does not change reports nothing.
	const shownRef = useRef<GridRangeState | null>(null)

	// The same range as state, for a controlled grid only. The effect below
	// compares it with the value of the owner after each render.
	const [screen, setScreen] = useState<GridRangeState | null>(null)

	const shown = useStableEvent((range: GridRangeState | null) => {
		shownRef.current = range

		if (controlled) setScreen(range)
	})

	// The range on screen, by the row key and the column id.
	const read = useStableEvent((): GridRangeState | null => {
		const cells = handle.readRange()

		if (!cells) return null

		const corner = (row: number | undefined, col: number): GridCellRef | null => {
			const rowKey = row === undefined ? undefined : rowKeys[row]

			const column = columns[col]

			return rowKey === undefined || !column ? null : { rowKey, columnId: column.id }
		}

		const anchor = corner(cells.from.row, cells.from.col)

		const focus = corner(focusRow(cells), cells.to.col)

		return anchor && focus ? { anchor, focus } : null
	})

	// Shows a value on a layout, or no range for a value that names a cell that
	// the layout does not hold.
	const show = useStableEvent(
		(
			next: GridRangeState | null,
			keys: readonly (string | number)[],
			cols: readonly GridColumn<T>[],
		) => {
			const at = (cell: GridCellRef): Coord | null => {
				const row = keys.indexOf(cell.rowKey)

				const col = cols.findIndex((column) => column.id === cell.columnId)

				return row === -1 || col === -1 ? null : { row, col }
			}

			const from = next && at(next.anchor)

			const to = next && at(next.focus)

			if (next && from && to && handle.selectRange(from, to)) {
				shown(next)

				return
			}

			handle.endRange()

			shown(null)
		},
	)

	// A range needs both corners. The store holds them once the cursor commits.
	const report = useStableEvent((anchor: Coord | null, focus: Coord | null) => {
		const current = anchor && focus ? read() : null

		if (sameRange(current, shownRef.current)) return

		shown(current)

		binding?.onValueChange?.(current)
	})

	const { anchor, focus } = handle

	// Each change of the range reports once, whatever moved it. A cursor move
	// with no range changes no range, so it reports nothing. The report comes
	// before the effects below, so it reads the range of this commit before a
	// value of the owner writes the next one.
	useLayoutEffect(() => report(anchor, focus), [anchor, focus, report])

	const seed = useStableEvent(() => {
		const initial = binding?.defaultValue

		if (!controlled && initial) show(initial, rowKeys, columns)
	})

	// The seed of an uncontrolled grid runs one time, before the first report.
	useLayoutEffect(() => seed(), [seed])

	// The value of a controlled grid at mount, a new value, a report that the
	// owner did not take, or a new layout. A report that the owner takes leaves
	// the two the same. A new layout can hold a row or a column of a value that
	// the last layout did not, as when the rows load or a filter ends.
	useLayoutEffect(() => {
		if (!controlled) return

		const target = value ?? null

		if (!sameRange(screen, target)) show(target, rowKeys, columns)
	}, [controlled, value, screen, rowKeys, columns, show])
}
