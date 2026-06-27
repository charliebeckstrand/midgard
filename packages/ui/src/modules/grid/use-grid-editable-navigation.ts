'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'
import { clamp } from '../../utilities'
import type { Coord, GridEditableNavigationApi } from './grid-editable-types'

/** Canonical `"row,col"` key for a cell coordinate, used by the extra-cells set. @internal */
export function cellKey(row: number, col: number): string {
	return `${row},${col}`
}

/** The inclusive rectangle bounds two coordinates span. @internal */
function rectBounds(a: Coord, b: Coord): { r0: number; r1: number; c0: number; c1: number } {
	return {
		r0: Math.min(a.row, b.row),
		r1: Math.max(a.row, b.row),
		c0: Math.min(a.col, b.col),
		c1: Math.max(a.col, b.col),
	}
}

/** Whether a cell falls inside the inclusive rectangle two coordinates span. @internal */
export function inRect(row: number, col: number, a: Coord, b: Coord): boolean {
	const { r0, r1, c0, c1 } = rectBounds(a, b)

	return row >= r0 && row <= r1 && col >= c0 && col <= c1
}

/** Visits every cell of the inclusive rectangle two coordinates span, row-major. @internal */
export function forEachInRect(a: Coord, b: Coord, visit: (row: number, col: number) => void): void {
	const { r0, r1, c0, c1 } = rectBounds(a, b)

	for (let r = r0; r <= r1; r++) {
		for (let c = c0; c <= c1; c++) visit(r, c)
	}
}

/**
 * Owns the cursor and range selection: reactive `active`/`anchor`/`extraCells`
 * for rendering, mirrored refs for event-time reads, and the move/extend
 * actions. `moveActiveTo` plants the anchor on extend and clears it otherwise;
 * `addCellToSelection` bakes the prior rectangle into `extraCells` (Ctrl-click);
 * `moveActiveTab` wraps across rows and returns `false` when the move exits the
 * grid so the caller can let the browser tab.
 *
 * @returns The grid's {@link GridEditableNavigationApi}.
 * @internal
 */
export function useGridEditableNavigation<T>({
	rowsRef,
	editableColCount,
}: {
	rowsRef: RefObject<T[]>
	editableColCount: number
}): GridEditableNavigationApi {
	const [active, setActive] = useState<Coord | null>(null)

	const [anchor, setAnchor] = useState<Coord | null>(null)

	const [extraCells, setExtraCells] = useState<Set<string>>(() => new Set())

	const activeRef = useRef<Coord | null>(null)

	activeRef.current = active

	const anchorRef = useRef<Coord | null>(null)

	anchorRef.current = anchor

	const extraCellsRef = useRef<Set<string>>(extraCells)

	extraCellsRef.current = extraCells

	const clampCoord = useCallback(
		(row: number, col: number): Coord => ({
			row: clamp(row, 0, rowsRef.current.length - 1),
			col: clamp(col, 0, editableColCount - 1),
		}),
		[editableColCount, rowsRef],
	)

	const moveActiveTo = useCallback((coord: Coord, extend = false) => {
		if (extend) {
			setAnchor((a) => a ?? activeRef.current)
		} else {
			setAnchor(null)

			if (extraCellsRef.current.size > 0) setExtraCells(new Set())
		}

		setActive(coord)
	}, [])

	// CMD/Ctrl+click: preserve everything currently selected (rect + prior
	// active + existing extras), then move focus to the clicked cell.
	const addCellToSelection = useCallback((coord: Coord) => {
		const baked = new Set(extraCellsRef.current)

		const prevActive = activeRef.current

		const prevAnchor = anchorRef.current

		if (prevActive) baked.add(cellKey(prevActive.row, prevActive.col))

		if (prevActive && prevAnchor) {
			forEachInRect(prevAnchor, prevActive, (r, c) => baked.add(cellKey(r, c)))
		}

		baked.delete(cellKey(coord.row, coord.col))

		setExtraCells(baked)

		setAnchor(null)

		setActive(coord)
	}, [])

	const moveActive = useCallback(
		(dRow: number, dCol: number, extend = false) => {
			if (rowsRef.current.length === 0 || editableColCount === 0) return

			const base = activeRef.current ?? { row: 0, col: 0 }

			moveActiveTo(clampCoord(base.row + dRow, base.col + dCol), extend)
		},
		[clampCoord, editableColCount, moveActiveTo, rowsRef],
	)

	// Tab-style horizontal movement that wraps to the next/previous row at the
	// end/start of the current row. Returns `false` when the move would exit
	// the grid (first/last cell); the caller lets the browser tab naturally.
	const moveActiveTab = useCallback(
		(dir: 1 | -1) => {
			const rowCount = rowsRef.current.length

			if (rowCount === 0 || editableColCount === 0) return false

			const base = activeRef.current ?? { row: 0, col: 0 }

			let nextCol = base.col + dir

			let nextRow = base.row

			if (nextCol >= editableColCount) {
				nextCol = 0

				nextRow += 1
			} else if (nextCol < 0) {
				nextCol = editableColCount - 1

				nextRow -= 1
			}

			if (nextRow < 0 || nextRow >= rowCount) return false

			moveActiveTo({ row: nextRow, col: nextCol })

			return true
		},
		[editableColCount, moveActiveTo, rowsRef],
	)

	return {
		active,
		anchor,
		extraCells,
		activeRef,
		anchorRef,
		extraCellsRef,
		setActive,
		setAnchor,
		setExtraCells,
		moveActiveTo,
		moveActive,
		moveActiveTab,
		addCellToSelection,
	}
}
