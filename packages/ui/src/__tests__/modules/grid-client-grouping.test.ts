import { fc, test } from '@fast-check/vitest'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridColumn, GridColumnFilterState, GridSortState } from '../../modules/grid'
import { toGridGroups } from '../../modules/grid/engine/grid-group/tree'
import { deriveLeafRows } from '../../modules/grid/engine/grid-table/state'
import { useGridTable } from '../../modules/grid/use-grid-table'
import { type EngineTransforms, engineTable } from '../helpers/grid-engine'
import { queryGroup, queryValue } from '../helpers/query-arbitrary'

/**
 * The grid groups its rows itself, off the engine. The engine grouped them
 * before. Both must give the same groups, with the same ids, values, and rows
 * in the same order, or the expansion state and the display change when the
 * grid moves between them.
 */
type Row = { id: number; team: unknown; score: unknown }

const columns: GridColumn<Row>[] = [
	{ id: 'team', title: 'Team', value: (row) => row.team, sortable: true, filterable: true },
	{ id: 'score', title: 'Score', value: (row) => row.score, sortable: true, filterable: true },
	// A custom comparator: by the remainder of the id.
	{
		id: 'rank',
		title: 'Rank',
		value: (row) => row.id % 3,
		sortable: true,
		sortFn: (a, b) => (a.id % 3) - (b.id % 3),
	},
	// A custom comparator that is no consistent order, so a sort of each group
	// can differ from the full order with the other rows taken out.
	{
		id: 'skew',
		title: 'Skew',
		value: (row) => row.id,
		sortable: true,
		sortFn: (a, b) => ((a.id * 7 + b.id * 3) % 5) - 2,
	},
]

const getKey = (row: Row) => `row-${row.id}`

// Few team values, so the groups hold several rows. `null`, `'null'`, and
// `undefined` test the text key of a group.
const team = fc.constantFrom<unknown>('a', 'b', 'B', 1, '1', null, 'null', undefined, '')

const rowsArb = fc
	.array(fc.record({ team, score: queryValue() }), { maxLength: 24 })
	.map((cells) => cells.map((cell, id) => ({ id, ...cell })))

const sortArb = fc.uniqueArray(
	fc.record({
		column: fc.constantFrom('team', 'score', 'rank', 'skew'),
		direction: fc.constantFrom<'asc' | 'desc'>('asc', 'desc'),
	}),
	{ maxLength: 2, selector: (entry) => entry.column },
) as fc.Arbitrary<GridSortState[]>

const filtersArb = fc.array(
	fc.record({ id: fc.constantFrom('team', 'score'), value: queryGroup(['team', 'score']) }),
	{ maxLength: 2 },
) as fc.Arbitrary<GridColumnFilterState[]>

/** The shape of a group that the comparison reads. */
function shape(groups: { id: string; value: unknown; leaves: { key: string | number }[] }[]) {
	return groups.map((group) => ({
		id: group.id,
		value: group.value,
		keys: group.leaves.map((leaf) => leaf.key),
	}))
}

/** What the grid gives for grouped `rows`. */
function gridView(rows: Row[], transforms: EngineTransforms, selection: Set<string>) {
	const { result } = renderHook(() =>
		useGridTable<Row>({
			rows,
			columns,
			getKey,
			selection,
			globalFilter: { value: transforms.query ?? '' },
			columnFilters: { value: transforms.filters ?? [] },
			sort: transforms.sort ?? [],
			setSort: () => {},
			grouping: 'team',
			grandTotal: true,
		}),
	)

	const view = result.current

	return {
		groups: shape(view.groups ?? []),
		ids: view.renderRows.map((row) => row.id),
		keys: view.rowKeys,
		total: view.grandTotalRows.map((row) => row.id),
		exported: view.rowsForExport().map((row) => row.id),
	}
}

/** The same view, read from the grouped and sorted row models of a stock engine table. */
function engineView(rows: Row[], transforms: EngineTransforms, selection: Set<string>) {
	const table = engineTable(rows, columns, getKey, {
		...transforms,
		query: transforms.query ?? '',
		filters: transforms.filters ?? [],
		sort: transforms.sort ?? [],
		grouping: 'team',
	})

	const display = table.getRowModel().rows

	const leaves = deriveLeafRows(display, true) ?? []

	const exported = deriveLeafRows(table.getSortedRowModel().rows, true) ?? []

	const selected = exported.filter((row) => selection.has(row.id))

	return {
		groups: shape(toGridGroups(display, 'team', getKey)),
		ids: leaves.map((row) => row.original.id),
		keys: leaves.map((row) => getKey(row.original)),
		total: table.getFilteredRowModel().rows.map((row) => row.original.id),
		exported: (selected.length > 0 ? selected : exported).map((row) => row.original.id),
	}
}

describe('useGridTable client grouping', () => {
	test.prop(
		[
			rowsArb,
			fc.string({ maxLength: 2 }),
			filtersArb,
			sortArb,
			fc.array(fc.nat({ max: 30 }), { maxLength: 4 }),
		],
		{ numRuns: 80 },
	)(
		'gives the groups, rows, total, and export of the engine',
		(rows, query, filters, sort, picks) => {
			const transforms: EngineTransforms = { query, filters, sort }

			const selection = new Set(picks.map((pick) => `row-${pick}`))

			expect(gridView(rows, transforms, selection)).toEqual(engineView(rows, transforms, selection))
		},
	)

	it('keys a group by the text of its value, and reads the value of its first row', () => {
		const rows: Row[] = [
			{ id: 0, team: null, score: 1 },
			{ id: 1, team: 'null', score: 2 },
			{ id: 2, team: 'a', score: 3 },
		]

		const { groups } = gridView(rows, {}, new Set())

		expect(groups).toEqual([
			{ id: 'team:null', value: undefined, keys: ['row-0', 'row-1'] },
			{ id: 'team:a', value: 'a', keys: ['row-2'] },
		])
	})
})
