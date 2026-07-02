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

	it('imposes no constraint when a value-requiring operator has an empty value', () => {
		// A cleared date rule (operator "on" → equals, value blank) must match every
		// row, not hide them all — the regression behind "clear the filter and the
		// rows don't come back".
		expect(matchQueryRule('equals', '2026-01-15', '')).toBe(true)

		expect(matchQueryRule('before', '2026-01-15', '')).toBe(true)

		expect(matchQueryRule('after', '2026-01-15', undefined)).toBe(true)

		// Same for a blank numeric comparison and a blank text match.
		expect(matchQueryRule('gt', 5, '')).toBe(true)

		expect(matchQueryRule('lt', 5, '')).toBe(true)

		expect(matchQueryRule('contains', 'Alice', '   ')).toBe(true)
	})

	it('still constrains when a value-requiring operator has a value', () => {
		expect(matchQueryRule('equals', '2026-01-15', '2026-01-15')).toBe(true)

		expect(matchQueryRule('equals', '2026-01-15', '2026-02-01')).toBe(false)

		expect(matchQueryRule('before', '2026-01-15', '2026-02-01')).toBe(true)
	})

	it('matches the between range operator inclusively', () => {
		expect(matchQueryRule('between', 5, [1, 10])).toBe(true)

		expect(matchQueryRule('between', 1, [1, 10])).toBe(true)

		expect(matchQueryRule('between', 10, [1, 10])).toBe(true)

		expect(matchQueryRule('between', 11, [1, 10])).toBe(false)
	})

	it('treats a blank between bound as open-ended', () => {
		// Only a lower bound: everything at or above it.
		expect(matchQueryRule('between', 100, [10, ''])).toBe(true)

		expect(matchQueryRule('between', 5, [10, ''])).toBe(false)

		// Only an upper bound: everything at or below it.
		expect(matchQueryRule('between', 5, ['', 10])).toBe(true)

		expect(matchQueryRule('between', 50, ['', 10])).toBe(false)

		// Both blank constrains nothing; a non-tuple value is ignored.
		expect(matchQueryRule('between', 5, ['', ''])).toBe(true)

		expect(matchQueryRule('between', 5, undefined)).toBe(true)
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
