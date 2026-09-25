// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import type { GridColumn, GridColumnFilterState } from '../../modules/grid'
import {
	compileColumnFilters,
	filterRowIndices,
} from '../../modules/grid/engine/grid-filter/filter'
import { compileSearch } from '../../modules/grid/engine/grid-search/search'
import type { QueryGroup } from '../../modules/query/engine/types'
import { engineTable } from '../helpers/grid-engine'
import { queryGroup, queryValue } from '../helpers/query-arbitrary'

/**
 * The grid filters its rows itself, and the engine builds no row model. The
 * rows that the filters keep must equal those of the filtered row model of a
 * stock engine table, which the grid read before.
 */
type Row = { name: unknown; code: unknown; note: unknown }

const columns: GridColumn<Row>[] = [
	// Filterable and searched, read through its value.
	{ id: 'name', title: 'Name', filterable: true, value: (row) => row.name },
	// A value that differs from the field.
	{
		id: 'code',
		title: 'Code',
		filterable: true,
		value: (row) => (row.code == null ? row.code : `#${row.code}`),
	},
	// Neither filterable nor searched.
	{ id: 'note', title: 'Note' },
]

/** The indices of the rows that a stock engine table keeps for the filters and the query. */
function engineFilter(rows: Row[], filters: GridColumnFilterState[], query: string): number[] {
	return engineTable(rows, columns, (_, index) => index, { query, filters })
		.getFilteredRowModel()
		.rows.map((row) => row.index)
}

/** The indices of the rows that the grid keeps itself. */
function offEngineFilter(rows: Row[], filters: GridColumnFilterState[], query: string): number[] {
	const tests = compileColumnFilters(columns, filters)

	const search = compileSearch(rows, columns, query)

	const byColumn = [...tests.values()]

	return filterRowIndices(rows, search ? [...byColumn, search] : byColumn)
}

const rowsArb = fc.array(
	fc.record({ name: queryValue(), code: queryValue(), note: queryValue() }),
	{
		maxLength: 25,
	},
)

/** A filter on a filterable column, or on no column. Its value can be a query or not. */
const filterArb = fc.record({
	id: fc.constantFrom('name', 'code', 'ghost'),
	value: fc.oneof(
		{ weight: 4, arbitrary: queryGroup(['name', 'code', 'other']) },
		{ weight: 1, arbitrary: fc.constantFrom<unknown>(null, 'text', 3, {}) },
	),
}) as fc.Arbitrary<GridColumnFilterState>

describe('compileColumnFilters', () => {
	test.prop([rowsArb, fc.array(filterArb, { maxLength: 3 }), fc.string({ maxLength: 2 })])(
		'keeps the rows the engine keeps',
		(rows, filters, query) => {
			expect(offEngineFilter(rows, filters, query)).toEqual(engineFilter(rows, filters, query))
		},
	)

	it('applies the last of two filters with the same id', () => {
		const rows: Row[] = [
			{ name: 'alpha', code: 1, note: null },
			{ name: 'beta', code: 2, note: null },
		]

		const contains = (text: string): QueryGroup => ({
			id: 'g',
			type: 'group',
			children: [{ id: 'r', type: 'rule', field: 'name', operator: 'contains', value: text }],
		})

		const filters = [
			{ id: 'name', value: contains('alp') },
			{ id: 'name', value: contains('bet') },
		]

		expect(offEngineFilter(rows, filters, '')).toEqual([1])

		expect(engineFilter(rows, filters, '')).toEqual([1])
	})

	it('applies no constraint for a filter on a column that is not filterable', () => {
		const rule = { id: 'r', type: 'rule', field: 'note', operator: 'contains', value: 'x' } as const

		const filters = [
			{ id: 'note', value: { id: 'g', type: 'group', children: [rule] } as QueryGroup },
		]

		expect(compileColumnFilters(columns, filters).size).toBe(0)

		const rows: Row[] = [
			{ name: 'a', code: 1, note: 'x' },
			{ name: 'b', code: 2, note: 'y' },
		]

		expect(offEngineFilter(rows, filters, '')).toEqual([0, 1])
	})
})
