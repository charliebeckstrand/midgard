import { describe, expect, it } from 'vitest'
import { resolveLabel } from '../../components/listbox/listbox-utilities'

describe('resolveLabel', () => {
	it('returns undefined in single mode when value is undefined', () => {
		expect(resolveLabel({ value: undefined, multiple: false })).toBeUndefined()
	})

	it('returns undefined in single mode when displayValue is missing', () => {
		expect(resolveLabel({ value: 'a', multiple: false })).toBeUndefined()
	})

	it('returns displayValue(value) in single mode', () => {
		expect(
			resolveLabel({
				value: { id: 1, name: 'Alice' },
				displayValue: (v) => v.name,
				multiple: false,
			}),
		).toBe('Alice')
	})

	it('returns undefined in multi mode when value is not an array', () => {
		expect(resolveLabel({ value: undefined, multiple: true })).toBeUndefined()
	})

	it('returns undefined in multi mode for an empty array', () => {
		expect(resolveLabel({ value: [], multiple: true })).toBeUndefined()
	})

	it('joins values with comma + space in multi mode when 3 or fewer are selected', () => {
		expect(
			resolveLabel({
				value: ['a', 'b', 'c'],
				displayValue: (v) => v.toUpperCase(),
				multiple: true,
			}),
		).toBe('A, B, C')
	})

	it('summarizes the selection count when more than 3 are selected', () => {
		expect(
			resolveLabel({
				value: ['a', 'b', 'c', 'd'],
				displayValue: (v) => v,
				multiple: true,
			}),
		).toBe('4 selected')
	})

	it('summarizes the selection count when displayValue is missing', () => {
		expect(resolveLabel({ value: ['a', 'b'], multiple: true })).toBe('2 selected')
	})
})
