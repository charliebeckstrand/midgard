import { describe, expect, it } from 'vitest'

import { iro } from '../../recipes/kiso'
import { marker, onSurface, onTint, strong } from '../../recipes/kiso/iro/ramp'
import { contrastOf, SURFACE, tinted } from '../helpers/contrast'

/**
 * The drift guard for the iro colour ramp.
 *
 * jsdom can't evaluate colour, and the browser axe pass only mounts each
 * component's default render in light mode — so most palette cells (and all of
 * dark mode) go unchecked there. This asserts every foreground rung clears its
 * floor against its declared surface, in both modes, straight from Tailwind's
 * theme: a sub-threshold shade fails here in milliseconds rather than slipping
 * through to a browser run that never renders that combination.
 *
 * Floors: 4.5:1 for text (WCAG 1.4.3), 3:1 for the graphical marker (1.4.11).
 */

const COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const
const TEXT_AA = 4.5
const NON_TEXT_AA = 3

describe('iro ramp contrast', () => {
	it('reproduces the documented green-600-on-white ratio (helper sanity)', () => {
		// The shade the merge raised: green-600 on white measured 3.21:1.
		expect(contrastOf('text-green-600', SURFACE.light)).toBeCloseTo(3.21, 1)
	})

	describe('onSurface clears text AA on the page surface', () => {
		for (const color of COLORS) {
			it(color, () => {
				const [light, dark] = onSurface[color]

				expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)
				expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
			})
		}
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		for (const color of COLORS) {
			it(color, () => {
				const [light, dark] = onTint[color]
				// The 15% wash the soft palette paints behind this foreground.
				const wash = iro.palette.soft.bg[color].join(' ')

				expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)
				expect(contrastOf(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)
				expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
				expect(contrastOf(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
			})
		}
	})

	it('strong (max-emphasis neutral) clears text AA', () => {
		const [light, dark] = strong

		expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)
		expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
	})

	describe('marker clears non-text 3:1 on the page surface', () => {
		for (const color of COLORS) {
			it(color, () => {
				const [light, dark] = marker[color]

				expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(NON_TEXT_AA)
				expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(NON_TEXT_AA)
			})
		}
	})
})
