import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * The selection Set is mirrored into the engine's `state.rowSelection`, so the
 * engine's selected-row model tracks the grid's selection (the convergence step:
 * selection state now lives on the engine, one-way, with the Set authoritative).
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

	it('reflects the selection Set in the engine selected-row model', () => {
		const { result } = renderHook(() =>
			useGridTable<Row>({ rows, columns, getKey, selection: new Set([1, 3]) }),
		)

		const selected = result.current.table
			.getSelectedRowModel()
			.rows.map((row) => row.original.id)
			.sort()

		expect(selected).toEqual([1, 3])
	})

	it('marks the matching engine rows selected, keyed by the stringified row id', () => {
		const { result } = renderHook(() =>
			useGridTable<Row>({ rows, columns, getKey, selection: new Set([2]) }),
		)

		expect(result.current.table.getRow('2').getIsSelected()).toBe(true)

		expect(result.current.table.getRow('1').getIsSelected()).toBe(false)
	})

	it('leaves the engine selection empty when no selection is bound', () => {
		const { result } = renderHook(() => useGridTable<Row>({ rows, columns, getKey }))

		expect(result.current.table.getSelectedRowModel().rows).toHaveLength(0)
	})
})
