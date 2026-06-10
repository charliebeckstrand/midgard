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

	it('emits mobile-first breakpoint-prefixed classes for a responsive value', () => {
		// Direction is mobile-first (min-width `md:`) to match gap/justify/Grid,
		// not desktop-first `max-md:`.
		const result = resolveDirection({ initial: 'row', md: 'col' })

		expect(result).toEqual(['flex-row', 'md:flex-col'])

		expect(result.some((c) => c.startsWith('max-'))).toBe(false)
	})
})

describe('resolveAlign', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveAlign(undefined)).toEqual([])
	})

	it('returns the align class for a scalar value', () => {
		expect(resolveAlign('center').length).toBe(1)
	})

	it('emits mobile-first breakpoint-prefixed classes for a responsive value', () => {
		const result = resolveAlign({ initial: 'start', sm: 'center' })

		expect(result).toEqual(['items-start', 'sm:items-center'])

		expect(result.some((c) => c.startsWith('max-'))).toBe(false)
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

	it.each([
		[0, 'gap-0'],
		['xs', 'gap-1'],
		['sm', 'gap-2'],
		['md', 'gap-3'],
		['lg', 'gap-4'],
		['xl', 'gap-6'],
	] as const)('maps the %s gap step to %s', (value, cls) => {
		expect(resolveGap(value)).toEqual([cls])
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		const result = resolveGap({ initial: 'sm', md: 'lg' })

		expect(result.length).toBe(2)

		expect(result.some((c) => c.startsWith('md:'))).toBe(true)
	})
})
