// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	clearSelection,
	type DashboardSelection,
	isScopeActive,
	scopeQuery,
	scopeRows,
	selectedValues,
	selectValue,
} from '../../modules/dashboard/engine/dashboard-scope'
import type { QueryGroup } from '../../modules/query/engine/types'

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
})
