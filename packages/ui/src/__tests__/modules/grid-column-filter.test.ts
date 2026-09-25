// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { constructTable } from '@tanstack/react-table'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it } from 'vitest'
import type { GridColumn, GridColumnFilterState } from '../../modules/grid'
import {
	compileColumnFilters,
	filterRowIndices,
} from '../../modules/grid/engine/grid-filter/filter'
import { compileSearch } from '../../modules/grid/engine/grid-search/search'
import { type GridFeatures, gridFeatures } from '../../modules/grid/engine/grid-table/features'
import { filterOptions, toColumnDef } from '../../modules/grid/engine/grid-table/options'
import type { QueryGroup } from '../../modules/query/engine/types'
import { queryGroup, queryValue } from '../helpers/query-arbitrary'

/**
 * When the client filters are the only transform, the grid filters its rows
 * itself, off the engine. The engine filters every other grid. Both must keep
 * the same rows, or a filter gives a different result when a second transform
 * starts.
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

/** The indices of the rows that the engine keeps for the filters and the query. */
function engineFilter(rows: Row[], filters: GridColumnFilterState[], query: string): number[] {
	// Outside React, the engine takes its reactivity from TanStack Store. In the
	// grid, `useTable` adds this feature.
	const features = { ...gridFeatures, coreReactivityFeature: storeReactivityBindings() }

	const table = constructTable({
		features: features as GridFeatures,
		data: rows,
		columns: columns.map((col) => toColumnDef(col)),
		getRowId: (_, index) => String(index),
		state: { columnFilters: filters, globalFilter: query },
		...filterOptions<Row>({
			configured: true,
			manual: false,
			onGlobalFilterChange: () => {},
			onColumnFiltersChange: () => {},
		}),
	})

	return table.getFilteredRowModel().rows.map((row) => row.index)
}

/** The indices of the rows that the grid keeps off the engine. */
function offEngineFilter(rows: Row[], filters: GridColumnFilterState[], query: string): number[] {
	const tests = compileColumnFilters(columns, filters)

	if (tests === null) throw new Error('the filters did not compile')

	const search = compileSearch(columns, query)

	return filterRowIndices(rows, search ? [...tests, search] : tests)
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

	it('gives null for a filter on a column that is not filterable', () => {
		const filters = [{ id: 'note', value: { id: 'g', type: 'group', children: [] } as QueryGroup }]

		expect(compileColumnFilters(columns, filters)).toBeNull()
	})
})
