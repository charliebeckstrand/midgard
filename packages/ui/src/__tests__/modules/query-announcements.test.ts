// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeNode } from '../../modules/query/engine/query-announcements'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField } from '../../modules/query/engine/types'
import { englishIntl, localeIntl } from '../../primitives/intl/intl-catalog'

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

		expect(describeNode(englishIntl, rule, fields)).toBe('Status is Active')
	})

	it('names a blank rule by its field', () => {
		expect(describeNode(englishIntl, createRule(nameField), fields)).toBe('Name rule')
	})

	it('names a rule with no known field as an empty rule', () => {
		expect(describeNode(englishIntl, createRule(), fields)).toBe('empty rule')
	})

	it('names a group as a condition group', () => {
		expect(describeNode(englishIntl, createGroup('and', [createRule(nameField)]), fields)).toBe(
			'condition group',
		)
	})
})

describe('describeNode in a locale', () => {
	const intl = localeIntl('es-ES')

	it('names a node in the language of the intl', () => {
		const rule = { ...createRule(nameField), operator: 'contains', value: 'lee' }

		expect(describeNode(intl, rule, fields)).toBe('Name contiene lee')

		expect(describeNode(intl, createRule(nameField), fields)).toBe('Regla de Name')

		expect(describeNode(intl, createGroup('and', [createRule(nameField)]), fields)).toBe(
			'grupo de condiciones',
		)
	})
})
