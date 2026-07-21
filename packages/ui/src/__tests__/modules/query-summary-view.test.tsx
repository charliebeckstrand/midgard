import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField } from '../../modules/query/engine/types'
import { QuerySummary } from '../../modules/query/query-summary'
import { renderUI } from '../helpers'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
	{
		name: 'status',
		label: 'Status',
		type: 'select',
		options: [{ value: 'active', label: 'Active' }],
	},
]

const summary = (container: HTMLElement) => container.querySelector('[data-slot="query-summary"]')

describe('QuerySummary', () => {
	it('renders nothing for a query with no active rules', () => {
		const { container } = renderUI(<QuerySummary root={createGroup()} fields={fields} />)

		expect(summary(container)).toBeNull()
	})

	it('renders an active rule as a line with the select label resolved', () => {
		const root = createGroup('and', [
			{ ...createRule(fields[2]), operator: 'equals', value: 'active' },
		])

		const { container } = renderUI(<QuerySummary root={root} fields={fields} />)

		expect(summary(container)).toHaveTextContent('Status is Active')
	})

	it('brackets a nested group in the rendered line', () => {
		const root = createGroup('and', [
			{ ...createRule(fields[0]), operator: 'contains', value: 'lee' },
			createGroup('or', [{ ...createRule(fields[1]), operator: 'gt', value: 30 }]),
		])

		const { container } = renderUI(<QuerySummary root={root} fields={fields} />)

		expect(summary(container)).toHaveTextContent('Name contains lee OR (Age > 30)')
	})
})
