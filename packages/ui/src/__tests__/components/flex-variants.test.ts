import { describe, expect, it } from 'vitest'
import {
	resolveAlign,
	resolveDirection,
	resolveGap,
	resolveJustify,
} from '../../components/flex/variants'

describe('resolveDirection', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveDirection(undefined)).toEqual([])
	})

	it('returns the direction class for a scalar value', () => {
		const result = resolveDirection('row')

		expect(result.length).toBe(1)
	})

	it('emits a class per breakpoint for a responsive value', () => {
		const result = resolveDirection({ initial: 'row', md: 'col' })

		expect(result.length).toBe(2)
	})
})

describe('resolveAlign', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveAlign(undefined)).toEqual([])
	})

	it('returns the align class for a scalar value', () => {
		expect(resolveAlign('center').length).toBe(1)
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		const result = resolveAlign({ initial: 'start', sm: 'center' })

		expect(result.length).toBe(2)
	})
})

describe('resolveJustify', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveJustify(undefined)).toEqual([])
	})

	it('returns the justify class for a scalar value', () => {
		expect(resolveJustify('between').length).toBe(1)
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		const result = resolveJustify({ initial: 'start', lg: 'end' })

		expect(result.length).toBe(2)

		expect(result.some((c) => c.startsWith('lg:'))).toBe(true)
	})
})

describe('resolveGap', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveGap(undefined)).toEqual([])
	})

	it('returns the gap class for a scalar value', () => {
		expect(resolveGap('md').length).toBe(1)
	})

	it('resolves 0 to gap-0', () => {
		expect(resolveGap(0)).toEqual(['gap-0'])
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		const result = resolveGap({ initial: 'sm', md: 'lg' })

		expect(result.length).toBe(2)

		expect(result.some((c) => c.startsWith('md:'))).toBe(true)
	})
})
