'use client'

import { useCallback, useMemo, useRef } from 'react'
import { isDataColumn } from '../../utilities'
import type { EditableGridColumn, EditableGridRowsApi } from './types'

/**
 * Derives the cell-rendering primitives from the grid's raw `rows`/`columns`:
 * a live `rowsRef`, the editable (cursor-visitable) columns, the row→index map,
 * and the `getKey`/`formatCell`/`parseValue` helpers.
 *
 * @returns `rowsApi` (the {@link EditableGridRowsApi}) and `rowIndexMap`
 *   (row identity to display index, for O(1) lookup during cell render).
 * @internal
 */
export function useEditableGridRows<T>({
	rows,
	columns,
	getKey,
}: {
	rows: T[]
	columns: EditableGridColumn<T>[]
	getKey: (row: T, index: number) => string | number
}) {
	const rowsRef = useRef(rows)

	rowsRef.current = rows

	// Editable columns (excludes selectable / actions): the columns the
	// active-cell cursor can land on.
	const editableCols = useMemo(() => columns.filter(isDataColumn), [columns])

	const rowIndexMap = useMemo(() => {
		const m = new Map<T, number>()

		rows.forEach((r, i) => {
			m.set(r, i)
		})

		return m
	}, [rows])

	const formatCell = useCallback((row: T, col: EditableGridColumn<T>) => {
		if (col.format) return col.format(row)

		if (!col.field) return ''

		const v = row[col.field]

		return v == null ? '' : String(v)
	}, [])

	const parseValue = useCallback((raw: string, row: T, col: EditableGridColumn<T>): unknown => {
		if (col.parse) return col.parse(raw, row)

		return raw
	}, [])

	const rowsApi: EditableGridRowsApi<T> = {
		rowsRef,
		editableCols,
		getKey,
		formatCell,
		parseValue,
	}

	return { rowsApi, rowIndexMap }
}
