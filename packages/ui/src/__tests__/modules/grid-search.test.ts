// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { constructTable } from '@tanstack/react-table'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { searchRowIndices } from '../../modules/grid/engine/grid-search/search'
import { type GridFeatures, gridFeatures } from '../../modules/grid/engine/grid-table/features'
import { filterOptions, toColumnDef } from '../../modules/grid/engine/grid-table/options'
import { resolveClientView } from '../../modules/grid/engine/grid-table/state'

/**
 * When the quick search is the only transform, the grid searches its rows
 * itself, off the engine. The engine searches every other grid. Both must keep
 * the same rows, or a search gives a different result when a second transform
 * starts.
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

/** The indices of the rows that the engine keeps for `query`. */
function engineSearch(rows: Row[], query: string): number[] {
	// Outside React, the engine takes its reactivity from TanStack Store. In the
	// grid, `useTable` adds this feature.
	const features = { ...gridFeatures, coreReactivityFeature: storeReactivityBindings() }

	const table = constructTable({
		features: features as GridFeatures,
		data: rows,
		columns: columns.map((col) => toColumnDef(col)),
		getRowId: (_, index) => String(index),
		state: { globalFilter: query },
		...filterOptions<Row>({ configured: true, manual: false, onGlobalFilterChange: () => {} }),
	})

	return table.getFilteredRowModel().rows.map((row) => row.index)
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
		columnFiltersCompile: true,
	}

	it.each([
		['a search', {}],
		['an active column filter', { columnFilters: [{ id: 'name', value: 'x' }] }],
		[
			'a column filter next to a search that only marks',
			{ globalHighlights: true, columnFilters: [{ id: 'name', value: 'x' }] },
		],
		['a search and a client page', { paginated: true }],
	])('filters off the engine with %s', (_, change) => {
		expect(resolveClientView({ ...base, ...change })).toMatchObject({
			offEngine: true,
			filtered: true,
		})
	})

	it.each([
		['an empty query', { globalFilter: '' }],
		['a search that only marks', { globalHighlights: true }],
		['a manual filter', { filterMode: { configured: true, manual: true } }],
		['a grid with no filter surface', { filterMode: { configured: false, manual: false } }],
		['a grid with no search', { globalFiltered: false }],
	])('runs off the engine with no filter, with %s', (_, change) => {
		expect(resolveClientView({ ...base, ...change })).toEqual({
			offEngine: true,
			filtered: false,
			page: null,
		})
	})

	it.each([
		[
			'a column filter that only the engine applies',
			{ columnFilters: [{ id: 'name', value: 'x' }], columnFiltersCompile: false },
		],
	])('leaves the transforms to the engine with %s', (_, change) => {
		expect(resolveClientView({ ...base, ...change })).toEqual({
			offEngine: false,
			filtered: false,
			page: null,
		})
	})

	it('slices the page of a client pagination only', () => {
		expect(resolveClientView({ ...base, paginated: true }).page).toBe(page)

		expect(resolveClientView({ ...base, paginated: true, paginationManual: true }).page).toBeNull()
	})

	it('keeps a manual filter off the engine, which then filters no row', () => {
		const manual = { filterMode: { configured: true, manual: true } }

		expect(
			resolveClientView({ ...base, ...manual, columnFilters: [{ id: 'name', value: 'x' }] }),
		).toMatchObject({ offEngine: true, filtered: false })
	})
})
