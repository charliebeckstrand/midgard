// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { colors, extendedColors } from '../../core/recipe'
import { k as alert } from '../../recipes/kata/alert'
import { k as avatar } from '../../recipes/kata/avatar'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'

/**
 * Each chromatic kata writes its own palette strings, so nothing shared keeps
 * them alike. This test does: a variant in a color paints the same colors in
 * each kata that offers it. It compares the color classes of the palette only (not the focus ring), and it reads a
 * hover class with the gate of its kata taken off. A Button hover is gated on
 * the disabled states, and a Badge hover on `href`, but each paints the same
 * color.
 */

const HUE = new RegExp(`-(?:${[...colors, ...extendedColors].join('|')})-\\d`)

/** The state prefixes that differ between the kata, for the same hover. */
const GATES = /^(?:not-disabled:not-data-disabled:|\[&\[href\]\]:)/

/** The color classes of a resolved class string, sorted, with the gate of each hover taken off. */
function paint(value: string): string[] {
	return value
		.split(' ')
		.filter((name) => HUE.test(name) && !name.includes('focus'))
		.map((name) => name.replace(GATES, ''))
		.sort()
}

/** The color classes of a Button in a variant and a color. */
function buttonPaint(variant: 'solid' | 'soft' | 'outline' | 'plain', color: string): string[] {
	return paint(button({ variant, color: color as 'zinc' }).base)
}

describe('palette parity', () => {
	const hues = [...colors, ...extendedColors]

	describe.each(['solid', 'soft', 'outline', 'plain'] as const)(
		'Badge %s matches Button',
		(variant) => {
			it.each(hues)('%s', (color) => {
				expect(paint(badge({ variant, color }))).toEqual(buttonPaint(variant, color))
			})
		},
	)

	/** The color classes of a Button with its hover classes taken off: Alert and Avatar have no hover. */
	const atRest = (variant: 'solid' | 'soft' | 'outline' | 'plain', color: string) =>
		paint(
			button({ variant, color: color as 'zinc' })
				.base.split(' ')
				.filter((name) => !name.includes('hover:'))
				.join(' '),
		)

	describe.each(['solid', 'soft', 'outline', 'plain'] as const)(
		'Alert %s matches Button at rest',
		(variant) => {
			it.each(colors)('%s', (color) => {
				expect(paint(alert({ variant, color }))).toEqual(atRest(variant, color))
			})
		},
	)

	describe.each(['solid', 'soft', 'outline'] as const)(
		'Avatar %s matches Button at rest',
		(variant) => {
			it.each(colors)('%s', (color) => {
				expect(paint(avatar({ variant, color }))).toEqual(atRest(variant, color))
			})
		},
	)
})
