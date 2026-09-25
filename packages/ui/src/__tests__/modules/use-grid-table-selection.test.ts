import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * The selection Set is mirrored into the engine's `state.rowSelection`, so the
 * engine's selected-row model tracks the grid's selection. The Set stays
 * authoritative. An export reads that model: the selected rows, else every row.
 */
describe('useGridTable selection mirror', () => {
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

	it('reflects the selection Set in the engine selected-row model', () => {
		expect(exported(new Set([1, 3]))).toEqual([1, 3])
	})

	it('marks the matching engine rows selected, keyed by the stringified row id', () => {
		expect(exported(new Set([2]))).toEqual([2])
	})

	it('takes every row when no selection is bound', () => {
		expect(exported()).toEqual([1, 2, 3])
	})
})
