import { describe, expect, it } from 'vitest'
import { kasane } from '../../recipes/kiso/kasane'

const { gap, radius } = kasane

// These helpers form the kasane spacing/radius API "for symmetry" (see the
// kasane index doc): some axes (gx/gy, ri/ro) have no internal consumer yet, so
// pin their class-string contract directly. Expected values are derived from
// the stop so a typo in a stop's literal class would fail.

describe('kasane.gap', () => {
	const stops = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '2', '2.5', '3'] as const

	it.each(stops)('maps g(%s) to the unprefixed gap class', (v) => {
		expect(gap.g(v)).toBe(`gap-${v}`)
	})

	it.each(stops)('maps gx(%s) to the x-axis gap class', (v) => {
		expect(gap.gx(v)).toBe(`gap-x-${v}`)
	})

	it.each(stops)('maps gy(%s) to the y-axis gap class', (v) => {
		expect(gap.gy(v)).toBe(`gap-y-${v}`)
	})
})

describe('kasane.radius', () => {
	const stops = ['0.5', '0.75', '1', '1.25', '1.5', '2', '2.5', '3'] as const

	it.each(stops)('maps r(%s) to the outer radius class', (v) => {
		expect(radius.r(v)).toBe(`rounded-[--spacing(${v})]`)
	})

	it.each(stops)('maps ri(%s) to the inset (before) radius class with a 1px deduction', (v) => {
		expect(radius.ri(v)).toBe(`before:rounded-[calc(--spacing(${v})-1px)]`)
	})

	it.each(stops)('maps ro(%s) to the overlay (after) radius class', (v) => {
		expect(radius.ro(v)).toBe(`after:rounded-[--spacing(${v})]`)
	})

	it.each(stops)('all(%s) returns the coordinated outer / inset / overlay trio', (v) => {
		expect(radius.all(v)).toEqual([radius.r(v), radius.ri(v), radius.ro(v)])
	})
})
