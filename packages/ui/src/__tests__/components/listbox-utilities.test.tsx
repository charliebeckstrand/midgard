// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveLabel } from '../../components/listbox/listbox-utilities'
import { intlEn } from '../../primitives/intl/intl-catalog'

describe('resolveLabel', () => {
	it('returns undefined in single mode when value is undefined', () => {
		expect(resolveLabel({ intl: intlEn, value: undefined, multiple: false })).toBeUndefined()
	})

	it('returns undefined in single mode when displayValue is missing', () => {
		expect(resolveLabel({ intl: intlEn, value: 'a', multiple: false })).toBeUndefined()
	})

	it('returns displayValue(value) in single mode', () => {
		expect(
			resolveLabel({
				intl: intlEn,
				value: { id: 1, name: 'Alice' },
				displayValue: (v) => v.name,
				multiple: false,
			}),
		).toBe('Alice')
	})

	it('returns undefined in multi mode when value is not an array', () => {
		expect(resolveLabel({ intl: intlEn, value: undefined, multiple: true })).toBeUndefined()
	})

	it('returns undefined in multi mode for an empty array', () => {
		expect(resolveLabel({ intl: intlEn, value: [], multiple: true })).toBeUndefined()
	})

	it('joins values with comma + space in multi mode when 3 or fewer are selected', () => {
		expect(
			resolveLabel({
				intl: intlEn,
				value: ['a', 'b', 'c'],
				displayValue: (v) => v.toUpperCase(),
				multiple: true,
			}),
		).toBe('A, B, C')
	})

	it('capitalizes each selected value in multi mode with capitalize', () => {
		expect(
			resolveLabel({
				intl: intlEn,
				value: ['route', 'load'],
				displayValue: (v) => v,
				multiple: true,
				capitalize: true,
			}),
		).toBe('Route, Load')
	})

	it('summarizes the selection count when more than 3 are selected', () => {
		expect(
			resolveLabel({
				intl: intlEn,
				value: ['a', 'b', 'c', 'd'],
				displayValue: (v) => v,
				multiple: true,
			}),
		).toBe('4 selected')
	})

	it('returns a node from displayValue in single mode, untouched by capitalize', () => {
		const node = <b>alpha</b>

		expect(
			resolveLabel({
				intl: intlEn,
				value: 'a',
				displayValue: () => node,
				multiple: false,
				capitalize: true,
			}),
		).toBe(node)
	})

	it('summarizes the selection count when displayValue is missing', () => {
		expect(resolveLabel({ intl: intlEn, value: ['a', 'b'], multiple: true })).toBe('2 selected')
	})
})
