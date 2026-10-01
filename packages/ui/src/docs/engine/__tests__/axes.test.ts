// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ComponentApi } from '../api-reference'
import { type Axis, type AxisValue, axesOf, distinctValues, isStepAxis, literalsOf } from '../axes'

describe('literalsOf', () => {
	it('reads string literals in source order', () => {
		expect(literalsOf("'solid' | 'soft' | 'outline'")).toEqual(['solid', 'soft', 'outline'])
	})

	it('reads double-quoted and numeric literals', () => {
		expect(literalsOf('"a" | 1 | -2.5')).toEqual(['a', 1, -2.5])
	})

	it('drops undefined and null', () => {
		expect(literalsOf("'sm' | 'md' | undefined | null")).toEqual(['sm', 'md'])
	})

	it('gives false, then true, for a boolean', () => {
		expect(literalsOf('boolean')).toEqual([false, true])

		expect(literalsOf('true | false')).toEqual([false, true])
	})

	it('keeps a boolean inside a mixed union', () => {
		expect(literalsOf("boolean | 'auto'")).toEqual([false, true, 'auto'])
	})

	it('returns null when a member is not a literal', () => {
		expect(literalsOf('ReactNode')).toBeNull()

		expect(literalsOf("'sm' | number")).toBeNull()

		expect(literalsOf('string')).toBeNull()
	})

	it('returns null for a union that a generic or an array wraps', () => {
		expect(literalsOf("Responsive<'sm' | 'md'>")).toBeNull()

		expect(literalsOf("('a' | 'b')[]")).toBeNull()
	})

	it('returns null for an empty union', () => {
		expect(literalsOf('undefined')).toBeNull()
	})
})

const api: ComponentApi = {
	name: 'Thing',
	props: [
		{ name: 'variant', type: "'solid' | 'soft'", default: "'soft'" },
		{ name: 'size', type: "'sm' | 'md'" },
		{ name: 'loading', type: 'boolean', default: 'true' },
		{ name: 'prefix', type: 'ReactNode' },
		{ name: 'old', type: "'a' | 'b'", deprecated: true },
		{ name: 'odd', type: "'a' | 'b'", default: "'c'" },
		{ name: 'side', type: "'top' | 'bottom'", default: "`'bottom'`" },
		{ name: 'note', type: "'x' | 'y'", default: "`'x'` (a note)" },
		{ name: 'as', type: "'div'", default: "'div'" },
	],
}

describe('axesOf', () => {
	it('lists each literal prop in prop order, with its default, also in a code span', () => {
		expect(axesOf(api)).toEqual([
			{ name: 'variant', values: ['solid', 'soft'], default: 'soft' },
			{ name: 'size', values: ['sm', 'md'] },
			{ name: 'loading', values: [false, true], default: true },
			{ name: 'odd', values: ['a', 'b'] },
			{ name: 'side', values: ['top', 'bottom'], default: 'bottom' },
			{ name: 'note', values: ['x', 'y'] },
		])
	})

	it('skips an omitted prop', () => {
		expect(axesOf(api, ['size', 'odd', 'side', 'note']).map((axis) => axis.name)).toEqual([
			'variant',
			'loading',
		])
	})
})

describe('isStepAxis', () => {
	it('accepts an axis of density steps, and no other', () => {
		expect(isStepAxis({ name: 'size', values: ['xs', 'sm', 'md', 'lg', 'xl'] })).toBe(true)

		expect(isStepAxis({ name: 'size', values: ['sm', 'md', 'lg'] })).toBe(true)

		expect(isStepAxis({ name: 'size', values: ['sm', 'md', '2xl'] })).toBe(false)

		expect(isStepAxis({ name: 'loading', values: [false, true] })).toBe(false)
	})
})

describe('distinctValues', () => {
	const steps: Axis = { name: 'size', values: ['xs', 'sm', 'md', 'lg', 'xl'] }

	/** A signature for each value, from a map of value to the form that it renders. */
	const from = (forms: Record<string, string | null>) => (value: AxisValue) =>
		forms[String(value)] ?? null

	it('drops each outer step that renders as its inner neighbor', () => {
		const signatureOf = from({ xs: 'a', sm: 'a', md: 'b', lg: 'c', xl: 'c' })

		expect(distinctValues(steps, signatureOf)).toEqual(['sm', 'md', 'lg'])
	})

	it('keeps each value that renders distinctly', () => {
		const signatureOf = from({ xs: 'a', sm: 'b', md: 'c', lg: 'd', xl: 'd' })

		expect(distinctValues(steps, signatureOf)).toEqual(['xs', 'sm', 'md', 'lg'])
	})

	it('keeps the default of a run', () => {
		const signatureOf = from({ xs: 'a', sm: 'a', md: 'a', lg: 'b', xl: 'b' })

		expect(distinctValues({ ...steps, default: 'xs' }, signatureOf)).toEqual(['xs', 'lg'])

		expect(distinctValues(steps, signatureOf)).toEqual(['md', 'lg'])
	})

	it('keeps each value with an unknown signature', () => {
		expect(distinctValues(steps, () => null)).toEqual(steps.values)
	})

	it('merges only neighbors', () => {
		const signatureOf = from({ xs: 'a', sm: 'b', md: 'a', lg: 'b', xl: 'a' })

		expect(distinctValues(steps, signatureOf)).toEqual(steps.values)
	})
})
