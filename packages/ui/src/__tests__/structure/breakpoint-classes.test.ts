// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { atBreakpoint } from '../../types/responsive'

// `responsive-variants.test.ts` makes sure that each prefixed class of a unit
// has CSS from `ui/tailwind.css`.

describe('atBreakpoint', () => {
	it('gives the classes unchanged with no breakpoint', () => {
		expect(atBreakpoint('p-2')).toBe('p-2')

		expect(atBreakpoint('p-2', 'initial')).toBe('p-2')
	})

	it('puts the prefix on each class', () => {
		expect(atBreakpoint('p-2 gap-1', 'md')).toBe('md:p-2 md:gap-1')
	})
})
