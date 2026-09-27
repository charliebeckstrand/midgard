// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeNode } from '../../modules/query/engine/query-announcements'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField } from '../../modules/query/engine/types'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{
		name: 'status',
		label: 'Status',
		type: 'select',
		options: [{ value: 'active', label: 'Active' }],
	},
]

const [nameField, statusField] = fields as [QueryField, QueryField]

describe('describeNode', () => {
	it('names an active rule by its summary text', () => {
		const rule = { ...createRule(statusField), operator: 'equals', value: 'active' }

		expect(describeNode(rule, fields)).toBe('Status is Active')
	})

	it('names a blank rule by its field', () => {
		expect(describeNode(createRule(nameField), fields)).toBe('Name rule')
	})

	it('names a rule with no known field as an empty rule', () => {
		expect(describeNode(createRule(), fields)).toBe('empty rule')
	})

	it('names a group as a condition group', () => {
		expect(describeNode(createGroup('and', [createRule(nameField)]), fields)).toBe(
			'condition group',
		)
	})
})
