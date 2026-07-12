import { describe, expect, it } from 'vitest'
import { isQueryActive } from '../../modules/query/engine/query-active'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField } from '../../modules/query/engine/types'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }

const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

const booleanField: QueryField = { name: 'active', label: 'Active', type: 'boolean' }

describe('isQueryActive', () => {
	const fields = [textField, numberField, booleanField]

	it('returns false for an empty group', () => {
		expect(isQueryActive(createGroup(), fields)).toBe(false)
	})

	it('returns false when every rule has no value', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: '' },
			{ ...createRule(numberField), operator: 'gt', value: '' },
		])

		expect(isQueryActive(group, fields)).toBe(false)
	})

	it('treats whitespace-only values as empty', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: '   ' },
		])

		expect(isQueryActive(group, fields)).toBe(false)
	})

	it('returns true once a rule carries a value', () => {
		const group = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: 'a' },
		])

		expect(isQueryActive(group, fields)).toBe(true)
	})

	it('returns true for a value-less operator even with no value', () => {
		const group = createGroup('and', [{ ...createRule(textField), operator: 'isEmpty', value: '' }])

		expect(isQueryActive(group, fields)).toBe(true)
	})

	it('finds an active rule nested inside a child group', () => {
		const inner = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: 'a' },
		])

		expect(isQueryActive(createGroup('and', [inner]), fields)).toBe(true)
	})

	it('treats a blank rule whose field is unknown as inactive', () => {
		// The field can't be resolved, so the value-less operator isn't recognized
		// and the rule falls back to its (empty) value — inactive.
		const group = createGroup('and', [
			{ ...createRule(textField), field: 'gone', operator: 'isEmpty', value: '' },
		])

		expect(isQueryActive(group, fields)).toBe(false)
	})

	it('treats a range with every bound blank as inactive', () => {
		const group = createGroup('and', [
			{ ...createRule(numberField), operator: 'between', value: ['', ''] },
		])

		expect(isQueryActive(group, fields)).toBe(false)
	})

	it('treats a one-sided range as active', () => {
		const group = createGroup('and', [
			{ ...createRule(numberField), operator: 'between', value: ['10', ''] },
		])

		expect(isQueryActive(group, fields)).toBe(true)
	})
})
