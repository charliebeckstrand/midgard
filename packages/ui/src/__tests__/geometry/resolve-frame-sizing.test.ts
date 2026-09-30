// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveFrameSizing } from '../../hooks/use-plot-frame'

/**
 * `resolveFrameSizing` takes a policy, a width and a height, and returns a
 * height and a reserve. It reads no element and touches no window: it ran under
 * jsdom only because it shared a file with the hook that calls it.
 */

describe('resolveFrameSizing', () => {
	it('derives the height from the width and reserves the same ratio', () => {
		expect(resolveFrameSizing({ mode: 'aspect', ratio: 16 / 9 }, 320, 0)).toEqual({
			height: 180,
			reserve: { mode: 'aspect', ratio: 16 / 9 },
		})

		expect(resolveFrameSizing({ mode: 'aspect', ratio: 2 }, 400, 0)).toEqual({
			height: 200,
			reserve: { mode: 'aspect', ratio: 2 },
		})
	})

	it('holds a fixed height with nothing to reserve, ignoring the container', () => {
		expect(resolveFrameSizing({ mode: 'fixed', height: 240 }, 320, 275)).toEqual({
			height: 240,
			reserve: null,
		})
	})

	it('fills the container height and reserves nothing when free-form', () => {
		expect(resolveFrameSizing({ mode: 'fill' }, 320, 275)).toEqual({
			height: 275,
			reserve: null,
		})
	})

	it('takes the measured remainder under aspect-fill, reserving nothing', () => {
		// The legend leaves the plot 200px inside a 320-wide 16/9 figure; the plot
		// takes that measured remainder rather than the full 180 the ratio would give.
		expect(resolveFrameSizing({ mode: 'aspect-fill', ratio: 16 / 9 }, 320, 200)).toEqual({
			height: 200,
			reserve: null,
		})
	})

	it('falls back to the full ratio height under aspect-fill before the remainder is measured', () => {
		// No measured height yet (server render, explicit width, test frame), so the
		// plot draws from the width alone at the full ratio rather than collapsing —
		// the browser refines it to the measured remainder once it lands.
		expect(resolveFrameSizing({ mode: 'aspect-fill', ratio: 16 / 9 }, 320, 0)).toEqual({
			height: 180,
			reserve: null,
		})

		// With no width either, nothing to derive from — the frame shell, no marks.
		expect(resolveFrameSizing({ mode: 'aspect-fill', ratio: 16 / 9 }, 0, 0)).toEqual({
			height: 0,
			reserve: null,
		})
	})

	it('yields no height until the width is measured, still reserving the ratio', () => {
		expect(resolveFrameSizing({ mode: 'aspect', ratio: 16 / 9 }, 0, 0)).toEqual({
			height: 0,
			reserve: { mode: 'aspect', ratio: 16 / 9 },
		})
	})

	it('fits the height to the width-bound radius plus the vertical margin, reserving offset and floor', () => {
		// radius = 400/2 - 100 = 100; height = 2*100 + 2*20; offset = 2*(20 - 100); min = 2*20.
		expect(resolveFrameSizing({ mode: 'content', hMargin: 100, vMargin: 20 }, 400, 0)).toEqual({
			height: 240,
			reserve: { mode: 'content', offset: -160, min: 40 },
		})
	})

	it('floors the content radius at zero instead of going negative', () => {
		// The margin alone exceeds the half-width, so only the vertical margin remains,
		// which is exactly the reserved `min` the CSS floor holds the box at.
		expect(resolveFrameSizing({ mode: 'content', hMargin: 300, vMargin: 20 }, 400, 0)).toEqual({
			height: 40,
			reserve: { mode: 'content', offset: -560, min: 40 },
		})
	})

	it('reserves the content offset and floor before the width is measured, so the box holds', () => {
		// height stays 0 until the width lands, but the reserve is already known —
		// the box holds its height from the first paint instead of collapsing.
		expect(resolveFrameSizing({ mode: 'content', hMargin: 100, vMargin: 20 }, 0, 0)).toEqual({
			height: 0,
			reserve: { mode: 'content', offset: -160, min: 40 },
		})
	})
})
