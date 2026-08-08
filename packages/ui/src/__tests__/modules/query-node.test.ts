import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField } from '../../modules/query/engine/types'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }

const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

const selectField: QueryField = {
	name: 'role',
	label: 'Role',
	type: 'select',
	options: [
		{ value: 'admin', label: 'Admin' },
		{ value: 'user', label: 'User' },
	],
}

const booleanField: QueryField = { name: 'active', label: 'Active', type: 'boolean' }

describe('createRule', () => {
	it('returns a rule with combinator defaulting to "and"', () => {
		const rule = createRule(textField)

		expect(rule.type).toBe('rule')

		expect(rule.combinator).toBe('and')

		expect(rule.field).toBe('title')
	})

	it('seeds the operator from the field’s default operator list', () => {
		expect(createRule(textField).operator).toBe('equals')
	})

	it('uses the supplied combinator', () => {
		expect(createRule(textField, 'or').combinator).toBe('or')
	})

	it('defaults the value per field type', () => {
		expect(createRule(textField).value).toBe('')

		expect(createRule(numberField).value).toBe('')

		expect(createRule(selectField).value).toBe('admin')

		expect(createRule(booleanField).value).toBeNull()
	})

	it('returns a rule with an empty field when no QueryField is supplied', () => {
		const rule = createRule()

		expect(rule.field).toBe('')

		expect(rule.operator).toBe('')
	})

	it('mints unique ids across calls', () => {
		const a = createRule(textField)

		const b = createRule(textField)

		expect(a.id).not.toBe(b.id)
	})
})

describe('createGroup', () => {
	it('returns an empty group with combinator defaulting to "and"', () => {
		const group = createGroup()

		expect(group.type).toBe('group')

		expect(group.combinator).toBe('and')

		expect(group.children).toEqual([])
	})

	it('honors the supplied combinator and children', () => {
		const child = createRule(textField)

		const group = createGroup('or', [child])

		expect(group.combinator).toBe('or')

		expect(group.children).toEqual([child])
	})
})
