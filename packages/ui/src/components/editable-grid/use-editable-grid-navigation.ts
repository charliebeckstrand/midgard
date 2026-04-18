'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'
import type { Coord } from './context'

export const cellKey = (row: number, col: number) => `${row},${col}`

export function useEditableGridNavigation<T>({
	rowsRef,
	editableColCount,
}: {
	rowsRef: RefObject<T[]>
	editableColCount: number
}) {
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
			row: Math.max(0, Math.min(rowsRef.current.length - 1, row)),
			col: Math.max(0, Math.min(editableColCount - 1, col)),
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
			const r0 = Math.min(prevAnchor.row, prevActive.row)
			const r1 = Math.max(prevAnchor.row, prevActive.row)
			const c0 = Math.min(prevAnchor.col, prevActive.col)
			const c1 = Math.max(prevAnchor.col, prevActive.col)

			for (let r = r0; r <= r1; r++) {
				for (let c = c0; c <= c1; c++) {
					baked.add(cellKey(r, c))
				}
			}
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
