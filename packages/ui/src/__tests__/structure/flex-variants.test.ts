// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	resolveAlign,
	resolveDirection,
	resolveGap,
	resolveJustify,
} from '../../structure/flex/variants'

describe('resolveDirection', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveDirection(undefined)).toEqual([])
	})

	it('returns the direction class for a scalar value', () => {
		expect(resolveDirection('row')).toEqual(['flex-row'])
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
		expect(resolveAlign('center')).toEqual(['items-center'])
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
		expect(resolveJustify('between')).toEqual(['justify-between'])
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		expect(resolveJustify({ initial: 'start', lg: 'end' })).toEqual([
			'justify-start',
			'lg:justify-end',
		])
	})
})

describe('resolveGap', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveGap(undefined)).toEqual([])
	})

	it.each([
		[0, 'gap-0'],
		['xs', 'density-gap-[0.25,0.5,1,1.5,2.5]'],
		['sm', 'density-gap-[0.5,1,2,3,4.5]'],
		['md', 'density-gap-[1,2,3,4,5]'],
		['lg', 'density-gap-[2,3,4,5,6]'],
		['xl', 'density-gap-[4,5,6,7,8]'],
	] as const)('maps the %s gap step to %s', (value, cls) => {
		expect(resolveGap(value)).toEqual([cls])
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		expect(resolveGap({ initial: 'sm', md: 'lg' })).toEqual([
			'density-gap-[0.5,1,2,3,4.5]',
			'md:density-gap-[2,3,4,5,6]',
		])
	})
})
