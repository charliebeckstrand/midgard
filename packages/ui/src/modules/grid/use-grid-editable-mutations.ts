'use client'

import { useCallback } from 'react'
import type {
	CellChange,
	Coord,
	GridEditableMutationsApi,
	GridEditableNavigationApi,
	GridEditableRowsApi,
	GridEditableSelectionApi,
} from './grid-editable-types'

/**
 * Cells to fill: the active cell, the active-to-anchor rectangle, and any
 * ctrl-clicked extras, de-duplicated.
 *
 * @internal
 */
function collectFillCoords(active: Coord, anchor: Coord | null, extras: Iterable<string>): Coord[] {
	const seen = new Set<string>()

	const coords: Coord[] = []

	const push = (row: number, col: number) => {
		const key = `${row},${col}`

		if (seen.has(key)) return

		seen.add(key)

		coords.push({ row, col })
	}

	push(active.row, active.col)

	if (anchor) {
		const r0 = Math.min(anchor.row, active.row)
		const r1 = Math.max(anchor.row, active.row)
		const c0 = Math.min(anchor.col, active.col)
		const c1 = Math.max(anchor.col, active.col)

		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) push(r, c)
		}
	}

	for (const key of extras) {
		const [rs, cs] = key.split(',')

		push(Number(rs), Number(cs))
	}

	return coords
}

/**
 * Cell-write operations for the editable grid: `applyCellWrite` parses and
 * writes a single cell (filling the whole column when the row is part of a
 * multi-row selection), and `applyBulkFill` writes one raw value across the
 * active cell, the anchored rectangle, and any ctrl-clicked extras. Both emit
 * the resulting {@link CellChange}s through `onValueChange`.
 */
export function useGridEditableMutations<T>({
	nav: { activeRef, anchorRef, extraCellsRef },
	rows: { rowsRef, editableCols, getKey, parseValue },
	selection: { selectionRef },
	onValueChange,
}: {
	nav: GridEditableNavigationApi
	rows: GridEditableRowsApi<T>
	selection: GridEditableSelectionApi
	onValueChange: (changes: CellChange[]) => void
}): GridEditableMutationsApi {
	const applyCellWrite = useCallback(
		(rowIdx: number, editableColIdx: number, raw: string) => {
			const col = editableCols[editableColIdx]

			if (!col || col.readOnly) return

			const currentRows = rowsRef.current

			const currentRow = currentRows[rowIdx]

			if (!currentRow) return

			const rowKey = getKey(currentRow, rowIdx)

			const value = parseValue(raw, currentRow, col)

			// If this row is part of a multi-row selection, fill the column.
			const sel = selectionRef.current

			const inSel = sel.has(rowKey) && sel.size > 1

			const changes: CellChange[] = []

			if (inSel) {
				currentRows.forEach((r, i) => {
					const rk = getKey(r, i)

					if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value })
				})
			} else {
				changes.push({ rowKey, columnId: col.id, value })
			}

			onValueChange(changes)
		},
		[editableCols, rowsRef, selectionRef, getKey, parseValue, onValueChange],
	)

	const applyBulkFill = useCallback(
		(raw: string) => {
			const a = activeRef.current

			const anc = anchorRef.current

			const extras = extraCellsRef.current

			if (!a) return false

			const coords = collectFillCoords(a, anc, extras)

			const changes: CellChange[] = []

			for (const { row: r, col: c } of coords) {
				const col = editableCols[c]

				const row = rowsRef.current[r]

				if (!col || !row || col.readOnly) continue

				changes.push({
					rowKey: getKey(row, r),
					columnId: col.id,
					value: parseValue(raw, row, col),
				})
			}

			if (changes.length) onValueChange(changes)

			return true
		},
		[editableCols, rowsRef, activeRef, anchorRef, extraCellsRef, getKey, parseValue, onValueChange],
	)

	return { applyCellWrite, applyBulkFill }
}
