import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn, GridSort } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * A search that is the only transform runs off the engine. With pagination
 * on, the engine runs the same search inside its pipeline. The two paths must
 * give the same rows in the same order, with the same keys.
 */
describe('useGridTable search', () => {
	type Row = { id: number; name: string | null; city: string }

	const rows: Row[] = [
		{ id: 1, name: 'Ada', city: 'Denver' },
		{ id: 2, name: null, city: 'Dublin' },
		{ id: 3, name: 'bob', city: 'Oslo' },
		{ id: 4, name: 'Dana', city: 'denver' },
		{ id: 5, name: 'Ed', city: 'Boston' },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', value: (row) => row.name, sortable: true },
		{ id: 'city', title: 'City', value: (row) => row.city },
	]

	const getKey = (row: Row) => `row-${row.id}`

	function view(query: string, sort: GridSort['value'], paginated: boolean) {
		const { result } = renderHook(() =>
			useGridTable<Row>({
				rows,
				columns,
				getKey,
				globalFilter: { value: query },
				sort,
				setSort: () => {},
				...(paginated ? { pagination: { value: { pageIndex: 0, pageSize: 50 } } } : {}),
			}),
		)

		return { ids: result.current.renderRows.map((row) => row.id), keys: result.current.rowKeys }
	}

	it.each([
		['a query alone', 'den', []],
		['a query that matches no row', 'zzz', []],
		['a query and an ascending sort', 'd', [{ column: 'name', direction: 'asc' }]],
		['a query and a descending sort', 'd', [{ column: 'name', direction: 'desc' }]],
	] as const)('gives the rows of the engine for %s', (_, query, sort) => {
		const off = view(query, [...sort], false)

		expect(off).toEqual(view(query, [...sort], true))

		expect(off.ids.length).toBeLessThan(rows.length)
	})

	it('matches without case, and skips an empty cell', () => {
		expect(view('DEN', [], false).ids).toEqual([1, 4])
	})
})
