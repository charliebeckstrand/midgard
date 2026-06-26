import { describe, expect, it } from 'vitest'
import {
	createGroup,
	createRule,
	evaluateQuery,
	matchQueryRule,
	type QueryField,
} from '../../modules/query'

describe('matchQueryRule', () => {
	it('matches text operators case-insensitively', () => {
		expect(matchQueryRule('contains', 'Alice', 'ali')).toBe(true)

		expect(matchQueryRule('startsWith', 'Alice', 'al')).toBe(true)

		expect(matchQueryRule('endsWith', 'Alice', 'CE')).toBe(true)

		expect(matchQueryRule('equals', 'Alice', 'Alice')).toBe(true)

		expect(matchQueryRule('notEquals', 'Alice', 'Bob')).toBe(true)
	})

	it('matches numeric operators', () => {
		expect(matchQueryRule('gt', 5, 3)).toBe(true)

		expect(matchQueryRule('lte', 3, 3)).toBe(true)

		expect(matchQueryRule('lt', 5, 3)).toBe(false)
	})

	it('handles noValue and unknown operators', () => {
		expect(matchQueryRule('isEmpty', '', undefined)).toBe(true)

		expect(matchQueryRule('isNotEmpty', 'x', undefined)).toBe(true)

		// An unknown (half-built) operator imposes no constraint.
		expect(matchQueryRule('???', 'x', 'y')).toBe(true)
	})
})

describe('evaluateQuery', () => {
	const textField: QueryField = { name: 'name', label: 'Name', type: 'text' }

	const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

	const getValue = (row: { name: string; age: number }) => (field: string) =>
		field === 'name' ? row.name : row.age

	it('matches everything for an empty group', () => {
		expect(evaluateQuery(createGroup('and'), () => undefined)).toBe(true)
	})

	it('ANDs sibling rules', () => {
		const tree = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: 'li' },
			{ ...createRule(numberField), operator: 'gt', value: 20 },
		])

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 30 }))).toBe(true)

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(false)
	})

	it('ORs sibling rules by their combinator', () => {
		const tree = createGroup('and', [
			{ ...createRule(textField), operator: 'equals', value: 'Bob' },
			{ ...createRule(numberField), combinator: 'or', operator: 'gt', value: 20 },
		])

		// name is not Bob, but age > 20 — the OR rule carries it.
		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 30 }))).toBe(true)

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(false)
	})
})
