// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/flex'

/** The classes of the flex box for the props, one by one. */
function classes(props: Parameters<typeof k>[0]): string[] {
	return k(props).base.split(' ')
}

describe('the direction of the flex unit', () => {
	it('is a row by default', () => {
		expect(classes({})).toContain('flex-row')
	})

	it('emits mobile-first breakpoint-prefixed classes for a responsive value', () => {
		// Direction is mobile-first (min-width `md:`) to match gap/justify/Grid,
		// not desktop-first `max-md:`.
		const result = classes({ direction: { initial: 'row', md: 'col' } })

		expect(result).toEqual(expect.arrayContaining(['flex-row', 'md:flex-col']))

		expect(result.some((className) => className.startsWith('max-'))).toBe(false)
	})
})

describe('the align of the flex unit', () => {
	it('gives no class when the value is unset', () => {
		expect(classes({}).some((className) => className.startsWith('items-'))).toBe(false)
	})

	it('emits mobile-first breakpoint-prefixed classes for a responsive value', () => {
		const result = classes({ align: { initial: 'start', sm: 'center' } })

		expect(result).toEqual(expect.arrayContaining(['items-start', 'sm:items-center']))

		expect(result.some((className) => className.startsWith('max-'))).toBe(false)
	})
})

describe('the justify of the flex unit', () => {
	it('emits breakpoint-prefixed classes for a responsive value', () => {
		expect(classes({ justify: { initial: 'start', lg: 'end' } })).toEqual(
			expect.arrayContaining(['justify-start', 'lg:justify-end']),
		)
	})
})

describe('the gap of the flex unit', () => {
	it('gives no class when the value is unset', () => {
		expect(classes({}).some((className) => className.includes('gap'))).toBe(false)
	})

	it.each([
		[0, 'density-gap-[0,0,0,0,0]'],
		['xs', 'density-gap-[0.25,0.5,1,1.5,2.5]'],
		['sm', 'density-gap-[0.5,1,2,3,4.5]'],
		['md', 'density-gap-[1,2,3,4,5]'],
		['lg', 'density-gap-[2,3,4,5,6]'],
		['xl', 'density-gap-[4,5,6,7,8]'],
	] as const)('maps the %s gap step to %s', (gap, className) => {
		expect(classes({ gap })).toContain(className)
	})

	it('emits breakpoint-prefixed classes for a responsive value', () => {
		expect(classes({ gap: { initial: 'sm', md: 'lg' } })).toEqual(
			expect.arrayContaining(['density-gap-[0.5,1,2,3,4.5]', 'md:density-gap-[2,3,4,5,6]']),
		)
	})

	// A plain `gap-0` outranks the `density` layer of the stepped gaps, so a
	// larger breakpoint did not replace it.
	it('keeps each gap step in the density layer, so a breakpoint replaces a 0 gap', () => {
		expect(classes({ gap: { initial: 0, md: 'lg' } })).toEqual(
			expect.arrayContaining(['density-gap-[0,0,0,0,0]', 'md:density-gap-[2,3,4,5,6]']),
		)
	})
})
