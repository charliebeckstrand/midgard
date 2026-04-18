'use client'

import { type RefObject, useCallback } from 'react'
import type { CellChange, Coord, EditableGridColumn } from './context'

export function useEditableGridMutations<T>({
	editableCols,
	rowsRef,
	selectionRef,
	activeRef,
	anchorRef,
	extraCellsRef,
	getRowKey,
	parseValue,
	onChange,
	setSelection,
}: {
	editableCols: EditableGridColumn<T>[]
	rowsRef: RefObject<T[]>
	selectionRef: RefObject<Set<string | number>>
	activeRef: RefObject<Coord | null>
	anchorRef: RefObject<Coord | null>
	extraCellsRef: RefObject<Set<string>>
	getRowKey: (row: T, index: number) => string | number
	parseValue: (raw: string, row: T, col: EditableGridColumn<T>) => unknown
	onChange: (changes: CellChange[]) => void
	setSelection: (selection: Set<string | number>) => void
}) {
	const applyCellWrite = useCallback(
		(rowIdx: number, editableColIdx: number, raw: string) => {
			const col = editableCols[editableColIdx]

			if (!col || col.readOnly) return

			const currentRows = rowsRef.current

			const currentRow = currentRows[rowIdx]

			if (!currentRow) return

			const rowKey = getRowKey(currentRow, rowIdx)

			const value = parseValue(raw, currentRow, col)

			// If this row is part of a multi-row selection, fill the column.
			const sel = selectionRef.current

			const inSel = sel.has(rowKey) && sel.size > 1

			const changes: CellChange[] = []

			if (inSel) {
				currentRows.forEach((r, i) => {
					const rk = getRowKey(r, i)

					if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value })
				})
			} else {
				changes.push({ rowKey, columnId: col.id, value })
			}

			onChange(changes)

			if (sel.size > 0) setSelection(new Set())
		},
		[editableCols, rowsRef, selectionRef, getRowKey, parseValue, onChange, setSelection],
	)

	const applyBulkFill = useCallback(
		(raw: string) => {
			const a = activeRef.current

			const anc = anchorRef.current

			const extras = extraCellsRef.current

			if (!a) return false

			const seen = new Set<string>()

			const coords: Coord[] = []

			const push = (row: number, col: number) => {
				const key = `${row},${col}`

				if (seen.has(key)) return

				seen.add(key)

				coords.push({ row, col })
			}

			push(a.row, a.col)

			if (anc) {
				const r0 = Math.min(anc.row, a.row)
				const r1 = Math.max(anc.row, a.row)
				const c0 = Math.min(anc.col, a.col)
				const c1 = Math.max(anc.col, a.col)

				for (let r = r0; r <= r1; r++) {
					for (let c = c0; c <= c1; c++) push(r, c)
				}
			}

			for (const key of extras) {
				const [rs, cs] = key.split(',')

				push(Number(rs), Number(cs))
			}

			const changes: CellChange[] = []

			for (const { row: r, col: c } of coords) {
				const col = editableCols[c]

				const row = rowsRef.current[r]

				if (!col || !row || col.readOnly) continue

				changes.push({
					rowKey: getRowKey(row, r),
					columnId: col.id,
					value: parseValue(raw, row, col),
				})
			}

			if (changes.length) {
				onChange(changes)

				if (selectionRef.current.size > 0) setSelection(new Set())
			}

			return true
		},
		[
			editableCols,
			rowsRef,
			selectionRef,
			activeRef,
			anchorRef,
			extraCellsRef,
			getRowKey,
			parseValue,
			onChange,
			setSelection,
		],
	)

	return { applyCellWrite, applyBulkFill }
}
