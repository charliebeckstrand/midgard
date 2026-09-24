// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isQueryActive } from '../../modules/query/engine/query-active'
import { evaluateQuery } from '../../modules/query/engine/query-evaluate'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import { summarizeQuery } from '../../modules/query/engine/query-summary'
import type { QueryField, QueryRule } from '../../modules/query/engine/types'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }

const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

const booleanField: QueryField = { name: 'active', label: 'Active', type: 'boolean' }

describe('isQueryActive', () => {
	it('returns false for an empty group', () => {
		expect(isQueryActive(createGroup())).toBe(false)
	})

	it('returns false when every rule has no value', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: '' },
			{ ...createRule(numberField), operator: 'gt', value: '' },
		])

		expect(isQueryActive(group)).toBe(false)
	})

	it('treats whitespace-only values as empty', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: '   ' },
		])

		expect(isQueryActive(group)).toBe(false)
	})

	it('returns true once a rule carries a value', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: 'a' },
		])

		expect(isQueryActive(group)).toBe(true)
	})

	it('returns true for a value-less operator even with no value', () => {
		const group = createGroup('and', [{ ...createRule(textField), operator: 'isEmpty', value: '' }])

		expect(isQueryActive(group)).toBe(true)
	})

	it('finds an active rule nested inside a child group', () => {
		const inner = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: 'a' },
		])

		expect(isQueryActive(createGroup('and', [inner]))).toBe(true)
	})

	it('treats a value-less operator on an unknown field as active', () => {
		// The evaluator applies the operator without a field set, so the rule
		// constrains the rows.
		const group = createGroup('and', [
			{ ...createRule(textField), field: 'gone', operator: 'isEmpty', value: '' },
		])

		expect(isQueryActive(group)).toBe(true)
	})

	it('treats a rule whose operator the evaluator does not know as inactive', () => {
		const group = createGroup('and', [{ ...createRule(textField), operator: 'custom', value: 'x' }])

		expect(isQueryActive(group)).toBe(false)
	})

	it('treats an inherited object key as an unknown operator', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'toString', value: 'x' },
		])

		expect(isQueryActive(group)).toBe(false)
	})

	it('treats a range with every bound blank as inactive', () => {
		const group = createGroup('and', [
			{ ...createRule(numberField), operator: 'between', value: ['', ''] },
		])

		expect(isQueryActive(group)).toBe(false)
	})

	it('treats a one-sided range as active', () => {
		const group = createGroup('and', [
			{ ...createRule(numberField), operator: 'between', value: ['10', ''] },
		])

		expect(isQueryActive(group)).toBe(true)
	})
})

// A rule constrains the rows only when the evaluator applies it. The filter
// accent, the summary and chips, and the rows each read a rule through one of
// these three functions. The three must give the same answer for each rule.
describe('the active judgement, the summary, and the evaluator', () => {
	const codeField: QueryField = {
		name: 'code',
		label: 'Code',
		type: 'text',
		operators: [{ value: 'matches', label: 'matches' }],
	}

	const fields = [textField, numberField, booleanField, codeField]

	// Each constraining rule below rejects at least one of these rows. The
	// `gone` cell has no field in the field set.
	const rows: Record<string, unknown>[] = [
		{ title: '', age: 5, active: true, code: 'abc', gone: 'y' },
		{ title: 'x', age: 50, active: false, code: 'xyz', gone: '' },
	]

	const cases: [name: string, patch: Partial<QueryRule>, constrains: boolean][] = [
		['an operator that no field offers', { field: 'title', operator: 'custom', value: 'x' }, false],
		[
			'an operator that only the field offers',
			{ field: 'code', operator: 'matches', value: 'a' },
			false,
		],
		['an inherited object key', { field: 'title', operator: 'valueOf', value: 'x' }, false],
		[
			'a value-less operator that the field does not offer',
			{ field: 'active', operator: 'isEmpty', value: undefined },
			true,
		],
		[
			'a value-less operator on an unknown field',
			{ field: 'gone', operator: 'isEmpty', value: undefined },
			true,
		],
		[
			'a known operator that the field does not offer',
			{ field: 'age', operator: 'contains', value: '50' },
			true,
		],
		['a known operator with a value', { field: 'title', operator: 'contains', value: 'x' }, true],
		[
			'a known operator with a blank value',
			{ field: 'title', operator: 'contains', value: '' },
			false,
		],
		['a range value that is not an array', { field: 'age', operator: 'between', value: 5 }, false],
	]

	it.each(cases)('gives one reading for %s', (_, patch, constrains) => {
		const group = createGroup('and', [{ ...createRule(), ...patch }])

		const rejects = rows.some((row) => !evaluateQuery(group, (field) => row[field]))

		expect(rejects).toBe(constrains)

		expect(isQueryActive(group)).toBe(constrains)

		expect(summarizeQuery(group, fields).length > 0).toBe(constrains)
	})
})
