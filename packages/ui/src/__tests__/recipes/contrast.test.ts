import { describe, expect, it } from 'vitest'

import { extendedColors } from '../../core/recipe'
import { iro } from '../../recipes/kiso'
import { marker, onSurface, onTint, strong } from '../../recipes/kiso/iro/ramp'
import {
	onSurface as spectrumOnSurface,
	onTint as spectrumOnTint,
} from '../../recipes/kiso/iro/spectrum'
import { contrastOf, SURFACE, tinted } from '../helpers/contrast'

/**
 * Drift guard for the iro colour ramp. Asserts every foreground rung clears
 * its contrast floor against its declared surface, in both light and dark modes,
 * resolved straight from Tailwind's theme.
 *
 * Floors: 4.5:1 for text (WCAG 1.4.3), 3:1 for the graphical marker (1.4.11).
 */

const COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const TEXT_AA = 4.5

const NON_TEXT_AA = 3

describe('iro ramp contrast', () => {
	it('reproduces the documented green-600-on-white ratio (helper sanity)', () => {
		// green-600 on white measures 3.21:1.
		expect(contrastOf('text-green-600', SURFACE.light)).toBeCloseTo(3.21, 1)
	})

	describe('onSurface clears text AA on the page surface', () => {
		it.each(COLORS)('%s', (color) => {
			const [light, dark] = onSurface[color]

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		it.each(COLORS)('%s', (color) => {
			const [light, dark] = onTint[color]

			// The 15% soft-palette wash behind this foreground.
			const wash = iro.palette.soft.bg[color].join(' ')

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	it('strong (max-emphasis neutral) clears text AA', () => {
		const [light, dark] = strong

		expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

		expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
	})

	describe('marker clears non-text 3:1 on the page surface', () => {
		it.each(COLORS)('%s', (color) => {
			const [light, dark] = marker[color]

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(NON_TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(NON_TEXT_AA)
		})
	})
})

/**
 * The same drift guard for the opt-in extended palette (`iro.spectrum`). The
 * extended ramp only carries the two foreground roles the wide palette reads —
 * `onSurface` (bare text) and `onTint` (plain / soft / outline text) — so both
 * must clear text AA on their declared surfaces in both modes.
 */
describe('iro spectrum (extended palette) contrast', () => {
	describe('onSurface clears text AA on the page surface', () => {
		it.each(extendedColors)('%s', (color) => {
			const [light, dark] = spectrumOnSurface[color]

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		it.each(extendedColors)('%s', (color) => {
			const [light, dark] = spectrumOnTint[color]

			// The 15% soft-palette wash behind this foreground.
			const wash = iro.spectrum.soft.bg[color].join(' ')

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})
})
