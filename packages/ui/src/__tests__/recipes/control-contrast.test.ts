// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { k as colorPanel } from '../../recipes/kata/color-panel'
import { k as radio } from '../../recipes/kata/radio'
import { k as rating } from '../../recipes/kata/rating'
import { k as slider } from '../../recipes/kata/slider'
import { k as rangeSlider } from '../../recipes/kata/slider-range'
import { k as switchKata } from '../../recipes/kata/switch'
import { k as text } from '../../recipes/kata/text'
import { sen } from '../../recipes/kiso'
import { check } from '../../recipes/kumi/check'
import { contrastRatio, WCAG_AA_TEXT, WCAG_NON_TEXT } from '../../utilities/contrast'
import { classNames } from '../helpers/class-stops'
import { getContrast, SURFACE, tinted } from '../helpers/contrast'

/**
 * Contrast guard for the marks that identify a control or carry a literal hue.
 * Each case reads its classes off the recipe and composites the translucent
 * layers over the page, as the browser does.
 *
 * Floors: 4.5:1 for text (WCAG 1.4.3), 3:1 for the edge of a control (1.4.11).
 */

/** The one class in `surface` that matches `pattern`. */
const only = vi.defineHelper((surface: unknown, pattern: RegExp): string => {
	const found = classNames([surface]).filter((className) => pattern.test(className))

	expect(found).toHaveLength(1)

	return found[0] as string
})

describe('Text color contrast', () => {
	const hues = ['zinc', 'red', 'amber', 'green', 'blue'] as const

	it.each(hues)('%s clears text AA in each mode', (color) => {
		const classes = classNames([text({ color }).base])

		const light = only(classes, /^text-[a-z]+-\d+$/)

		const dark = only(classes, /^dark:text-[a-z]+-\d+$/)

		expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(WCAG_AA_TEXT)

		expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_AA_TEXT)
	})
})

describe('check surface edge contrast', () => {
	const surface = check.slots.base.base

	it.for([
		{ mode: 'light', fill: /^bg-white$/, edge: /^border-zinc-950\/\d+$/ },
		{ mode: 'dark', fill: /^dark:bg-white\/\d+$/, edge: /^dark:border-white\/\d+$/ },
	] as const)('the resting border clears 3:1 against the $mode page', ({ mode, fill, edge }) => {
		const filled = tinted(only(surface, fill), SURFACE[mode])

		const edged = tinted(only(surface, edge), filled)

		expect(contrastRatio(edged, SURFACE[mode])).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})

	it('the checked zinc radio fill clears 3:1 in each mode', () => {
		const classes = classNames([radio({ color: 'zinc' }).base])

		const light = only(classes, /^\[--check-bg:/)

		const dark = only(classes, /^dark:\[--check-bg:/)

		expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)

		expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})
})

describe('Switch track edge contrast', () => {
	const classes = classNames([switchKata({}).base])

	it.for([
		{ mode: 'light', fill: /^bg-zinc-\d+$/, edge: /^ring-zinc-950\/\d+$/ },
		{ mode: 'dark', fill: /^dark:bg-white\/\d+$/, edge: /^dark:ring-white\/\d+$/ },
	] as const)('the off ring clears 3:1 against the $mode page', ({ mode, fill, edge }) => {
		const track = tinted(only(classes, fill), SURFACE[mode])

		const edged = tinted(only(classes, edge), track)

		expect(contrastRatio(edged, SURFACE[mode])).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})
})

describe('Switch checked track edge contrast', () => {
	const classes = classNames([switchKata({ color: 'zinc' }).base])

	it.for([
		{ mode: 'light', fill: /^\[--switch-bg:/, edge: /^\[--switch-bg-ring:/ },
		{ mode: 'dark', fill: /^dark:\[--switch-bg:/, edge: /^dark:\[--switch-bg-ring:/ },
	] as const)(
		'the zinc checked track clears 3:1 against the $mode page',
		({ mode, fill, edge }) => {
			const track = tinted(only(classes, fill), SURFACE[mode])

			const edged = tinted(only(classes, edge), track)

			expect(contrastRatio(edged, SURFACE[mode])).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
		},
	)
})

describe('Slider edge contrast', () => {
	const group = classNames([slider({}).base])

	// At the minimum value the track has no fill, so the ring of the track and the
	// ring of the thumb are the only edges that show the control.
	it.for([
		{ mode: 'light', fill: /^\[--slider-track:/, edge: /^\[--slider-track-ring:/ },
		{ mode: 'dark', fill: /^dark:\[--slider-track:/, edge: /^dark:\[--slider-track-ring:/ },
	] as const)('the track ring clears 3:1 against the $mode page', ({ mode, fill, edge }) => {
		const track = tinted(only(group, fill), SURFACE[mode])

		const edged = tinted(only(group, edge), track)

		expect(contrastRatio(edged, SURFACE[mode])).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})

	it('each slider paints the ring of the track', () => {
		const native = classNames([slider({}).base])

		expect(native).toContain('[&::-webkit-slider-runnable-track]:ring-(--slider-track-ring)')

		expect(native).toContain('[&::-moz-range-track]:ring-(--slider-track-ring)')

		expect(classNames([rangeSlider({}).track])).toContain('ring-(--slider-track-ring)')
	})

	it.for([
		{
			name: 'native WebKit',
			classes: sen.ring.thumb,
			ring: /^(dark:)?\[&::-webkit-slider-thumb\]:ring-(zinc|white)/,
		},
		{
			name: 'native Gecko',
			classes: sen.ring.thumb,
			ring: /^(dark:)?\[&::-moz-range-thumb\]:ring-(zinc|white)/,
		},
		{ name: 'RangeSlider', classes: rangeSlider({}).thumb, ring: /^(dark:)?ring-(zinc|white)/ },
	])('the $name thumb ring clears 3:1 against the page in each mode', ({ classes, ring }) => {
		const rings = classNames([classes]).filter((className) => ring.test(className))

		const light = only(rings, /^[^d]/)

		const dark = only(rings, /^dark:/)

		expect(contrastRatio(tinted(light, SURFACE.light), SURFACE.light)).toBeGreaterThanOrEqual(
			WCAG_NON_TEXT,
		)

		expect(contrastRatio(tinted(dark, SURFACE.dark), SURFACE.dark)).toBeGreaterThanOrEqual(
			WCAG_NON_TEXT,
		)
	})
})

describe('Rating empty star contrast', () => {
	const classes = classNames([rating({}).track])

	it('the empty star clears 3:1 against the page in each mode', () => {
		expect(getContrast(only(classes, /^text-zinc-\d+$/), SURFACE.light)).toBeGreaterThanOrEqual(
			WCAG_NON_TEXT,
		)

		expect(getContrast(only(classes, /^dark:text-zinc-\d+$/), SURFACE.dark)).toBeGreaterThanOrEqual(
			WCAG_NON_TEXT,
		)
	})
})

describe('ColorPanel handle contrast', () => {
	// The white corner of the area is the hardest ground of the handle. The white
	// border shows the handle on a dark color.
	it('the outer ring clears 3:1 on white', () => {
		const edge = only(colorPanel({}).handle, /^ring-black\/\d+$/)

		expect(contrastRatio(tinted(edge, SURFACE.light), SURFACE.light)).toBeGreaterThanOrEqual(
			WCAG_NON_TEXT,
		)
	})
})
