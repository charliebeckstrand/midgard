// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { k as radio } from '../../recipes/kata/radio'
import { k as switchKata } from '../../recipes/kata/switch'
import { k as text } from '../../recipes/kata/text'
import { control } from '../../recipes/kiso/control'
import { contrastRatio, WCAG_AA_TEXT, WCAG_NON_TEXT } from '../../utilities/contrast'
import { contrastOf, SURFACE, tinted } from '../helpers/contrast'

/**
 * Contrast guard for the marks that identify a control or carry a literal hue.
 * Each case reads its classes off the recipe and composites the translucent
 * layers over the page, as the browser does.
 *
 * Floors: 4.5:1 for text (WCAG 1.4.3), 3:1 for the edge of a control (1.4.11).
 */

type ClassTree = string | readonly ClassTree[]

const classesOf = (surface: ClassTree): string[] =>
	typeof surface === 'string' ? surface.split(/\s+/).filter(Boolean) : surface.flatMap(classesOf)

/** The one class in `surface` that matches `pattern`. */
function only(surface: ClassTree, pattern: RegExp): string {
	const found = classesOf(surface).filter((cls) => pattern.test(cls))

	expect(found).toHaveLength(1)

	return found[0] as string
}

describe('Text color contrast', () => {
	const hues = ['zinc', 'red', 'amber', 'green', 'blue'] as const

	it.each(hues)('%s clears text AA in each mode', (color) => {
		const classes = classesOf(text({ color }))

		const light = only(classes, /^text-[a-z]+-\d+$/)

		const dark = only(classes, /^dark:text-[a-z]+-\d+$/)

		expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(WCAG_AA_TEXT)

		expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_AA_TEXT)
	})
})

describe('check surface edge contrast', () => {
	const { base: surface } = control.check

	it('the resting border clears 3:1 against the light page', () => {
		const fill = tinted(only(surface, /^bg-white$/), SURFACE.light)

		const edge = tinted(only(surface, /^border-zinc-950\/\d+$/), fill)

		expect(contrastRatio(edge, SURFACE.light)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})

	it('the resting border clears 3:1 against the dark page', () => {
		const fill = tinted(only(surface, /^dark:bg-white\/\d+$/), SURFACE.dark)

		const edge = tinted(only(surface, /^dark:border-white\/\d+$/), fill)

		expect(contrastRatio(edge, SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})

	it('the checked zinc radio fill clears 3:1 in each mode', () => {
		const classes = classesOf(radio({ color: 'zinc' }))

		const light = only(classes, /^\[--check-bg:/)

		const dark = only(classes, /^dark:\[--check-bg:/)

		expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)

		expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})
})

describe('Switch track edge contrast', () => {
	const classes = classesOf(switchKata({}))

	it('the off ring clears 3:1 against the light page', () => {
		const track = tinted(only(classes, /^bg-zinc-\d+$/), SURFACE.light)

		const edge = tinted(only(classes, /^ring-zinc-950\/\d+$/), track)

		expect(contrastRatio(edge, SURFACE.light)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})

	it('the off ring clears 3:1 against the dark page', () => {
		const track = tinted(only(classes, /^dark:bg-white\/\d+$/), SURFACE.dark)

		const edge = tinted(only(classes, /^dark:ring-white\/\d+$/), track)

		expect(contrastRatio(edge, SURFACE.dark)).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
	})
})
