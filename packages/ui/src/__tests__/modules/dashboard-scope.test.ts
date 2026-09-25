// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	clearSelection,
	type DashboardSelection,
	isScopeActive,
	liveSelections,
	scopeQuery,
	scopeRows,
	selectedValues,
	selectValue,
} from '../../modules/dashboard/engine/dashboard-scope'
import { formatQuerySummary } from '../../modules/query/engine/query-summary'
import type { QueryField, QueryGroup } from '../../modules/query/engine/types'

type Sale = { region: string; product: string; amount: number }

const sales: Sale[] = [
	{ region: 'North', product: 'Tea', amount: 10 },
	{ region: 'North', product: 'Coffee', amount: 20 },
	{ region: 'South', product: 'Tea', amount: 30 },
	{ region: 'West', product: 'Coffee', amount: 40 },
]

const read = (row: Sale, field: string) => row[field as keyof Sale]

describe('selectValue', () => {
	it('replaces the selection, and clears it on a second select of the only value', () => {
		let selections: DashboardSelection[] = []

		selections = selectValue(selections, 'map', 'region', 'North')

		selections = selectValue(selections, 'map', 'region', 'South')

		expect(selectedValues(selections, 'map', 'region')).toEqual(['South'])

		selections = selectValue(selections, 'map', 'region', 'South')

		expect(selections).toEqual([])
	})

	it('toggles membership when additive', () => {
		let selections: DashboardSelection[] = []

		selections = selectValue(selections, 'map', 'region', 'North', { additive: true })

		selections = selectValue(selections, 'map', 'region', 'South', { additive: true })

		expect(selectedValues(selections, 'map', 'region')).toEqual(['North', 'South'])

		selections = selectValue(selections, 'map', 'region', 'North', { additive: true })

		expect(selectedValues(selections, 'map', 'region')).toEqual(['South'])
	})

	it('stores values as text, as the equals operator reads them', () => {
		expect(selectValue([], 'bars', 'year', 2024)[0]?.values).toEqual(['2024'])
	})

	it('keeps one selection for each source and field', () => {
		const selections = selectValue(selectValue([], 'a', 'region', 'North'), 'b', 'region', 'West')

		expect(selections).toHaveLength(2)

		expect(clearSelection(selections, 'a')).toEqual([selections[1]])
	})
})

describe('scopeQuery and scopeRows', () => {
	const filter: QueryGroup = {
		id: 'f',
		type: 'group',
		children: [{ id: 'r', type: 'rule', field: 'amount', operator: 'gte', value: 20 }],
	}

	const selections = selectValue([], 'map', 'region', 'North')

	it('applies the filter and the selections of the other tiles', () => {
		const query = scopeQuery(filter, selections, 'bars')

		expect(scopeRows(sales, query, read)).toEqual([sales[1]])
	})

	it('hides the selection of the viewer from the viewer', () => {
		const query = scopeQuery(filter, selections, 'map')

		expect(scopeRows(sales, query, read)).toEqual([sales[1], sales[2], sales[3]])
	})

	it('joins the values of one selection with or', () => {
		const both = selectValue(selections, 'map', 'region', 'West', { additive: true })

		const query = scopeQuery(undefined, both, null)

		expect(scopeRows(sales, query, read).map((row) => row.region)).toEqual([
			'North',
			'North',
			'West',
		])
	})

	it('reports an empty scope, which matches each row', () => {
		const query = scopeQuery(undefined, [], null)

		expect(isScopeActive(query)).toBe(false)

		expect(scopeRows(sales, query, read)).toEqual(sales)
	})

	it('reads a filter of blank rules, empty groups, or malformed values as inactive', () => {
		const filters: QueryGroup[] = [
			{
				id: 'f',
				type: 'group',
				children: [{ id: 'r', type: 'rule', field: 'region', operator: 'equals', value: '' }],
			},
			{ id: 'f', type: 'group', children: [{ id: 'g', type: 'group', children: [] }] },
			{
				id: 'f',
				type: 'group',
				children: [{ id: 'r', type: 'rule', field: 'amount', operator: 'gt', value: 'abc' }],
			},
		]

		for (const filter of filters) {
			const query = scopeQuery(filter, [], null)

			// The evaluator reads each of them as no constraint, so the scope does too.
			expect(isScopeActive(query)).toBe(false)

			expect(scopeRows(sales, query, read)).toEqual(sales)
		}
	})
})

describe('a blank selection', () => {
	type Place = { region: string | null | undefined }

	const places: Place[] = [{ region: 'West' }, { region: 'East' }, { region: null }, { region: '' }]

	const regionOf = (row: Place, field: string) => row[field as keyof Place]

	const rows = (selections: DashboardSelection[]) => {
		const query = scopeQuery(undefined, selections, null)

		return {
			active: isScopeActive(query),
			regions: scopeRows(places, query, regionOf).map((row) => row.region),
		}
	}

	it('selects the rows whose field is empty, and reads as active', () => {
		for (const value of ['', null, undefined]) {
			expect(rows(selectValue([], 'map', 'region', value))).toEqual({
				active: true,
				regions: [null, ''],
			})
		}
	})

	it('adds the empty rows to a selected value, in either order', () => {
		const westFirst = selectValue(selectValue([], 'map', 'region', 'West'), 'map', 'region', '', {
			additive: true,
		})

		const blankFirst = selectValue(selectValue([], 'map', 'region', ''), 'map', 'region', 'West', {
			additive: true,
		})

		for (const selections of [westFirst, blankFirst]) {
			expect(rows(selections)).toEqual({ active: true, regions: ['West', null, ''] })
		}
	})

	it('shows with the isEmpty label of the field, else as is Empty', () => {
		const query = scopeQuery(undefined, selectValue([], 'map', 'region', ''), null)

		const offered: QueryField = {
			name: 'region',
			label: 'Region',
			type: 'text',
			operators: [{ value: 'isEmpty', label: 'has no value', noValue: true }],
		}

		const plain: QueryField = { name: 'region', label: 'Region', type: 'select' }

		expect(formatQuerySummary(query, [offered])).toBe('(Region has no value)')

		expect(formatQuerySummary(query, [plain])).toBe('(Region is Empty)')
	})
})

describe('liveSelections', () => {
	const selections: DashboardSelection[] = [
		{ source: 'map', field: 'region', values: ['North'] },
		{ source: '', field: 'product', values: ['Tea'] },
		{ source: 'gone', field: 'region', values: ['West'] },
	]

	it('keeps the selections of the board and of the mounted tiles', () => {
		expect(liveSelections(selections, new Set(['map']))).toEqual(selections.slice(0, 2))
	})

	it('returns the same list when each selection applies', () => {
		expect(liveSelections(selections, new Set(['map', 'gone']))).toBe(selections)
	})

	it('applies only the selections of the board when no tile is on the board', () => {
		expect(liveSelections(selections, new Set())).toEqual([selections[1]])
	})
})
