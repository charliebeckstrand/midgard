import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn, GridSort } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'
import { engineTable } from '../helpers/grid-engine'

/**
 * The grid searches and sorts its rows itself. Its rows must equal those of
 * the filtered and sorted row models of a stock engine table, in the same
 * order, with the same keys.
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

	function view(query: string, sort: GridSort['value']) {
		const { result } = renderHook(() =>
			useGridTable<Row>({
				rows,
				columns,
				getKey,
				globalFilter: { value: query },
				sort,
				setSort: () => {},
			}),
		)

		return { ids: result.current.renderRows.map((row) => row.id), keys: result.current.rowKeys }
	}

	/** The rows and keys of a stock engine table. */
	function engineView(query: string, sort: GridSort['value']) {
		const shown = engineTable(rows, columns, getKey, { query, sort: sort ?? [] }).getRowModel().rows

		return {
			ids: shown.map((row) => row.original.id),
			keys: shown.map((row) => getKey(row.original)),
		}
	}

	it.each([
		['a query alone', 'den', []],
		['a query that matches no row', 'zzz', []],
		['a query and an ascending sort', 'd', [{ column: 'name', direction: 'asc' }]],
		['a query and a descending sort', 'd', [{ column: 'name', direction: 'desc' }]],
	] as const)('gives the rows of the engine for %s', (_, query, sort) => {
		const off = view(query, [...sort])

		expect(off).toEqual(engineView(query, [...sort]))

		expect(off.ids.length).toBeLessThan(rows.length)
	})

	it('matches without case, and skips an empty cell', () => {
		expect(view('DEN', []).ids).toEqual([1, 4])
	})
})
