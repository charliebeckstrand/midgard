// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ComponentApi } from '../api-reference'
import { axesOf, literalsOf } from '../axes'

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
	it('lists each literal prop with its default, also in a code span', () => {
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

	it('shows the variant, the color, the size, and the shape first, then each other axis in prop order', () => {
		const props = ['open', 'radius', 'side', 'size', 'tone', 'variant'].map((name) => ({
			name,
			type: "'a' | 'b'",
		}))

		expect(axesOf({ name: 'Chip', props }).map((axis) => axis.name)).toEqual([
			'variant',
			'tone',
			'size',
			'radius',
			'open',
			'side',
		])
	})
})
