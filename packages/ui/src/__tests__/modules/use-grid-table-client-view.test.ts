import { fc, test } from '@fast-check/vitest'
import { renderHook } from '@testing-library/react'
import { describe, expect } from 'vitest'
import type {
	GridColumn,
	GridColumnFilterState,
	GridPagination,
	GridSortState,
} from '../../modules/grid'
import { toColumnFacets } from '../../modules/grid/engine/grid-table/views'
import { useGridTable } from '../../modules/grid/use-grid-table'
import { type EngineTransforms, engineTable } from '../helpers/grid-engine'
import { queryGroup, queryValue } from '../helpers/query-arbitrary'

/**
 * Without grouping, the grid filters, sorts, and pages its rows itself. The
 * engine runs the same transforms for a grouped grid. Both must give the same
 * rows in the same order, the same keys, and the same page totals.
 */
type Row = { id: number; name: unknown; amount: unknown }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', value: (row) => row.name, sortable: true, filterable: true },
	{ id: 'amount', title: 'Amount', value: (row) => row.amount, sortable: true, filterable: true },
]

const getKey = (row: Row) => `row-${row.id}`

const rowsArb = fc
	.array(fc.record({ name: queryValue(), amount: queryValue() }), { maxLength: 24 })
	.map((cells) => cells.map((cell, id) => ({ id, ...cell })))

// The grid's sort model names a column once, so the sort list does too.
const sortArb = fc.uniqueArray(
	fc.record({
		column: fc.constantFrom('name', 'amount'),
		direction: fc.constantFrom<'asc' | 'desc'>('asc', 'desc'),
	}),
	{ maxLength: 2, selector: (entry) => entry.column },
) as fc.Arbitrary<GridSortState[]>

const filtersArb = fc.array(
	fc.record({ id: fc.constantFrom('name', 'amount'), value: queryGroup(['name', 'amount']) }),
	{ maxLength: 2 },
) as fc.Arbitrary<GridColumnFilterState[]>

const pageStateArb = fc.record({
	pageIndex: fc.nat({ max: 5 }),
	pageSize: fc.oneof(fc.integer({ min: 1, max: 7 }), fc.constant(Infinity)),
})

/** No pagination, a client page, or a server page with its totals. */
const pageArb = fc.option(
	fc.record({
		state: pageStateArb,
		config: fc.oneof(
			fc.constant<GridPagination>({}),
			fc.record<GridPagination>({ manual: fc.constant(true) }),
			fc.record<GridPagination>({ rowCount: fc.nat({ max: 40 }) }),
			fc.record<GridPagination>({ pageCount: fc.integer({ min: -1, max: 6 }) }),
		),
	}),
	{ nil: undefined },
)

/** The rows, keys, and page totals that the grid gives for `transforms`. */
function gridView(rows: Row[], transforms: EngineTransforms) {
	const { page } = transforms

	const { result } = renderHook(() =>
		useGridTable<Row>({
			rows,
			columns,
			getKey,
			globalFilter: { value: transforms.query ?? '' },
			columnFilters: { value: transforms.filters ?? [] },
			sort: transforms.sort ?? [],
			setSort: () => {},
			grandTotal: true,
			...(page ? { pagination: { ...page.config, value: page.state } } : {}),
		}),
	)

	const { renderRows, rowKeys, pagination, grandTotalRows } = result.current

	return {
		ids: renderRows.map((row) => row.id),
		keys: rowKeys,
		totalIds: grandTotalRows.map((row) => row.id),
		totals: pagination && {
			pageCount: pagination.pageCount,
			rowCount: pagination.rowCount,
			canPrevious: pagination.canPrevious,
			canNext: pagination.canNext,
		},
	}
}

/** The same view, read from a stock engine table. */
function engineView(rows: Row[], transforms: EngineTransforms) {
	const table = engineTable(rows, columns, getKey, {
		...transforms,
		query: transforms.query ?? '',
		filters: transforms.filters ?? [],
		sort: transforms.sort ?? [],
	})

	const shown = table.getRowModel().rows

	const { page } = transforms

	const manual =
		page && (page.config.manual || page.config.rowCount != null || page.config.pageCount != null)

	return {
		ids: shown.map((row) => row.original.id),
		keys: shown.map((row) => getKey(row.original)),
		// A grand total reads every row that the filters keep, in data order.
		totalIds: table.getFilteredRowModel().rows.map((row) => row.original.id),
		totals: page
			? {
					pageCount: table.getPageCount(),
					rowCount: manual ? page.config.rowCount : table.getPrePaginatedRowModel().rows.length,
					canPrevious: table.getCanPreviousPage(),
					canNext: table.getCanNextPage(),
				}
			: null,
	}
}

describe('useGridTable client view', () => {
	test.prop([rowsArb, fc.string({ maxLength: 2 }), filtersArb, sortArb, pageArb], { numRuns: 60 })(
		'gives the rows, keys, grand-total rows, and page totals of the engine',
		(rows, query, filters, sort, page) => {
			const transforms: EngineTransforms = { query, filters, sort, ...(page ? { page } : {}) }

			expect(gridView(rows, transforms)).toEqual(engineView(rows, transforms))
		},
	)
})

describe('engine sort of an undefined cell', () => {
	test.prop([fc.constantFrom<'asc' | 'desc'>('asc', 'desc')])(
		'puts a literal undefined last in both directions, as the grid does',
		(direction) => {
			const rows: Row[] = [
				{ id: 0, name: undefined, amount: 1 },
				{ id: 1, name: 'b', amount: 2 },
				{ id: 2, name: 'a', amount: 3 },
			]

			const sort: GridSortState[] = [{ column: 'name', direction }]

			const ids = engineView(rows, { sort }).ids

			expect(ids.at(-1)).toBe(0)

			expect(gridView(rows, { sort }).ids).toEqual(ids)
		},
	)
})

describe('useGridTable facets', () => {
	/** The facets of each filterable column, as the grid gives them. */
	function gridFacets(rows: Row[], transforms: EngineTransforms) {
		const { result } = renderHook(() =>
			useGridTable<Row>({
				rows,
				columns,
				getKey,
				globalFilter: {
					value: transforms.query ?? '',
					...(transforms.highlight ? { mode: 'highlight' as const } : {}),
				},
				columnFilters: { value: transforms.filters ?? [] },
			}),
		)

		const { filters } = result.current

		return columns.map((col) => filters?.facets(col.id))
	}

	/** The same facets, read from the faceted model of a stock engine table. */
	function engineFacets(rows: Row[], transforms: EngineTransforms) {
		const table = engineTable(rows, columns, getKey, {
			...transforms,
			query: transforms.query ?? '',
			filters: transforms.filters ?? [],
		})

		return columns.map((col) =>
			toColumnFacets(table.getColumn(String(col.id))?.getFacetedUniqueValues().keys() ?? []),
		)
	}

	test.prop([rowsArb, fc.string({ maxLength: 2 }), fc.boolean(), filtersArb], { numRuns: 60 })(
		'gives the facets of the engine',
		(rows, query, highlight, filters) => {
			const transforms: EngineTransforms = { query, highlight, filters }

			expect(gridFacets(rows, transforms)).toEqual(engineFacets(rows, transforms))
		},
	)
})
