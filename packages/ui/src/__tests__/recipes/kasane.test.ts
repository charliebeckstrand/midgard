import { describe, expect, it } from 'vitest'
import { kasane } from '../../recipes/kiso/kasane'

const { gap, radius, layers } = kasane

// Pins the class-string contract for kasane spacing/radius helpers; expected
// values are derived from the stop, so a typo in a literal class fails here.

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

describe('kasane.layers', () => {
	// Both decorative pseudo-element layers sit absolutely over the frame and must
	// stay transparent to pointer events; otherwise the `::before`/`::after`
	// (which belong to the frame) intercept clicks and cursors meant for the
	// non-positioned affix slots below them. The leak is light-mode only because
	// `surface.default` hides `::before` in dark mode — see layers.ts.
	it('keeps the inset fill from capturing pointer events', () => {
		expect(layers.inset.join(' ')).toContain('before:pointer-events-none')
	})

	it('keeps the overlay ring from capturing pointer events', () => {
		expect(layers.overlay.join(' ')).toContain('after:pointer-events-none')
	})

	it('carries both pointer-events guards through the bundled all stack', () => {
		const all = layers.all.join(' ')

		expect(all).toContain('before:pointer-events-none')
		expect(all).toContain('after:pointer-events-none')
	})
})
