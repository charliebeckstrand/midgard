import { describe, expect, it } from 'vitest'
import { withColumnQuery } from '../../modules/grid/engine/grid-table/filter-view'
import type { GridColumnFilterState } from '../../modules/grid/types'
import type { QueryGroup } from '../../modules/query/engine/types'

/** A query with one rule on `field`, or with no rule. */
function query(field: string | null): QueryGroup {
	return {
		id: 'g',
		type: 'group',
		children: field ? [{ id: 'r', type: 'rule', field, operator: 'contains', value: 'a' }] : [],
	}
}

const filterable = new Set(['name', 'role'])

describe('withColumnQuery', () => {
	it('appends the query of a column with no entry', () => {
		const name: GridColumnFilterState = { id: 'name', value: query('name') }

		expect(withColumnQuery([name], 'role', query('role'), filterable)).toEqual([
			name,
			{ id: 'role', value: query('role') },
		])
	})

	it('replaces the entry of the column in place', () => {
		const prev: GridColumnFilterState[] = [
			{ id: 'name', value: query('name') },
			{ id: 'role', value: query('role') },
		]

		const next = withColumnQuery(prev, 'name', query('other'), filterable)

		expect(next.map((entry) => entry.id)).toEqual(['name', 'role'])

		expect(next[0]?.value).toEqual(query('other'))
	})

	it('removes the entry for no query or an empty query', () => {
		const prev: GridColumnFilterState[] = [{ id: 'name', value: query('name') }]

		expect(withColumnQuery(prev, 'name', undefined, filterable)).toEqual([])

		expect(withColumnQuery(prev, 'name', query(null), filterable)).toEqual([])
	})

	it('drops each vacant entry of a filterable column, and keeps the entries of other columns', () => {
		const prev = [
			{ id: 'role', value: query(null) },
			{ id: 'note', value: query(null) },
		] as GridColumnFilterState[]

		expect(withColumnQuery(prev, 'name', query('name'), filterable)).toEqual([
			{ id: 'note', value: query(null) },
			{ id: 'name', value: query('name') },
		])
	})
})
