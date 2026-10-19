// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { adaptive, SIZE_CLASSES, valueAt, withInitial } from '../../types/responsive'

describe('adaptive', () => {
	it('keys each size class by the breakpoint where it starts', () => {
		expect(adaptive({ compact: 'vertical', medium: 'horizontal' })).toEqual({
			initial: 'vertical',
			[SIZE_CLASSES.medium]: 'horizontal',
		})

		expect(adaptive({ compact: 'col', expanded: 'row' })).toEqual({
			initial: 'col',
			[SIZE_CLASSES.expanded]: 'row',
		})
	})

	it('holds the value of the last smaller size class at each breakpoint', () => {
		const value = adaptive({ compact: 'bottom', medium: 'center', expanded: 'top' })

		expect(valueAt(value, 'initial', 'bottom')).toBe('bottom')

		expect(valueAt(value, 'md', 'bottom')).toBe('center')

		expect(valueAt(value, '2xl', 'bottom')).toBe('top')
	})
})

describe('withInitial', () => {
	it('names the fallback as `initial` in a map that names none', () => {
		expect(withInitial({ md: 'inline' }, 'drawer')).toEqual({ initial: 'drawer', md: 'inline' })
	})

	it('keeps a bare value and a map that names `initial`', () => {
		const named = { initial: 'inline', md: 'drawer' }

		expect(withInitial(named, 'drawer')).toBe(named)

		expect(withInitial('inline', 'drawer')).toBe('inline')
	})
})
