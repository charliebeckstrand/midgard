import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * An export reads the grid's selection Set: the selected rows, else every row.
 * The engine keeps no selection state.
 */
describe('useGridTable export selection', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = [
		{ id: 1, name: 'Ada' },
		{ id: 2, name: 'Bo' },
		{ id: 3, name: 'Cy' },
	]

	const getKey = (row: Row) => row.id

	const exported = (selection?: Set<number>) => {
		const { result } = renderHook(() => useGridTable<Row>({ rows, columns, getKey, selection }))

		return result.current.rowsForExport().map((row) => row.id)
	}

	it('takes the rows in the selection Set', () => {
		expect(exported(new Set([1, 3]))).toEqual([1, 3])
	})

	it('matches the keys against the stringified row ids', () => {
		expect(exported(new Set([2]))).toEqual([2])
	})

	it('takes every row when no selection is bound', () => {
		expect(exported()).toEqual([1, 2, 3])
	})
})
