// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { searchRowIndices } from '../../modules/grid/engine/grid-search/search'
import { resolveClientView } from '../../modules/grid/engine/grid-table/state'
import { engineTable } from '../helpers/grid-engine'

/**
 * The grid searches its rows itself, and the engine builds no row model. The
 * rows that the search keeps must equal those of the global filter of a stock
 * engine table, which the grid read before.
 */
type Row = { name: unknown; code: unknown; note: unknown }

const columns: GridColumn<Row>[] = [
	// A data column with a value: searched.
	{ id: 'name', title: 'Name', value: (row) => row.name },
	// A value that differs from the field: searched through the value.
	{ id: 'code', title: 'Code', value: (row) => (row.code == null ? row.code : `#${row.code}`) },
	// No value: not searched.
	{ id: 'note', title: 'Note' },
]

/** The indices of the rows that a stock engine table keeps for `query`. */
function engineSearch(rows: Row[], query: string): number[] {
	return engineTable(rows, columns, (_, index) => index, { query })
		.getFilteredRowModel()
		.rows.map((row) => row.index)
}

const cell = fc.oneof(
	fc.string({ maxLength: 6 }),
	fc.integer({ min: -50, max: 500 }),
	fc.constantFrom(null, undefined, true, 0, 'Ärger', 'MIXED case', 'ΟΔΟΣ', 'a\u0000b'),
)

const rowsArb = fc.array(fc.record({ name: cell, code: cell, note: cell }), { maxLength: 30 })

describe('searchRowIndices', () => {
	test.prop([
		rowsArb,
		fc.oneof(fc.string({ maxLength: 3 }), fc.constantFrom('\u0000', 'a\u0000', 'σ', 'ς')),
	])('keeps the rows the engine keeps', (rows, query) => {
		expect(searchRowIndices(rows, columns, query)).toEqual(engineSearch(rows, query))
	})

	test.prop([rowsArb.filter((rows) => rows.length > 0), fc.nat(), fc.nat(), fc.boolean()])(
		'keeps the rows the engine keeps, for a query cut from a cell',
		(rows, pick, start, upper) => {
			const row = rows[pick % rows.length] as Row

			const text = String(row.name ?? row.code ?? 'x')

			const cut = text.slice(start % (text.length + 1), (start % (text.length + 1)) + 3)

			const query = upper ? cut.toUpperCase() : cut

			expect(searchRowIndices(rows, columns, query)).toEqual(engineSearch(rows, query))
		},
	)

	it('matches no text across two cells, with or without the separator in the query', () => {
		const rows: Row[] = [{ name: 'ab', code: null, note: null }]

		const split: Row[] = [{ name: 'a', code: 'b', note: null }]

		expect(searchRowIndices(split, columns, 'a#b')).toEqual([])

		expect(searchRowIndices(split, columns, 'a\u0000#b')).toEqual(engineSearch(split, 'a\u0000#b'))

		expect(searchRowIndices(rows, columns, 'ab')).toEqual([0])
	})

	it('keeps every row for a grid with no searched column', () => {
		const rows: Row[] = [
			{ name: 'a', code: 1, note: 'x' },
			{ name: 'b', code: 2, note: 'y' },
		]

		const plain: GridColumn<Row>[] = [{ id: 'note', title: 'Note' }]

		expect(searchRowIndices(rows, plain, 'zzz')).toEqual([0, 1])
	})
})

describe('resolveClientView', () => {
	const page = { pageIndex: 2, pageSize: 10 }

	const base = {
		paginated: false,
		paginationManual: false,
		pagination: page,
		filterMode: { configured: true, manual: false },
		globalFiltered: true,
		globalFilter: 'ab',
		globalHighlights: false,
		columnFilters: [],
	}

	it.each([
		['a search', {}],
		['an active column filter', { columnFilters: [{ id: 'name', value: 'x' }] }],
		[
			'a column filter next to a search that only marks',
			{ globalHighlights: true, columnFilters: [{ id: 'name', value: 'x' }] },
		],
	])('filters the rows with %s', (_, change) => {
		expect(resolveClientView({ ...base, ...change }).filtered).toBe(true)
	})

	it.each([
		['an empty query', { globalFilter: '' }],
		['a search that only marks', { globalHighlights: true }],
		['a manual filter', { filterMode: { configured: true, manual: true } }],
		['a grid with no filter surface', { filterMode: { configured: false, manual: false } }],
		['a grid with no search', { globalFiltered: false }],
		[
			'a manual column filter',
			{
				filterMode: { configured: true, manual: true },
				columnFilters: [{ id: 'name', value: 'x' }],
			},
		],
	])('filters no row with %s', (_, change) => {
		expect(resolveClientView({ ...base, ...change }).filtered).toBe(false)
	})

	it('slices the page of a client pagination only', () => {
		expect(resolveClientView(base).page).toBeNull()

		expect(resolveClientView({ ...base, paginated: true }).page).toBe(page)

		expect(resolveClientView({ ...base, paginated: true, paginationManual: true }).page).toBeNull()
	})
})
