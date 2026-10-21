// @vitest-environment node
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'

import { colors, extendedColors } from '../../core/recipe'
import { k as alert } from '../../recipes/kata/alert'
import { k as avatar } from '../../recipes/kata/avatar'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'
import { k as calendar } from '../../recipes/kata/calendar'
import { k as events } from '../../recipes/kata/events'
import { k as link } from '../../recipes/kata/link'
import { k as passwordStrength } from '../../recipes/kata/password-strength'
import { k as pdfViewer } from '../../recipes/kata/pdf-viewer'
import { k as text } from '../../recipes/kata/text'
import { iro } from '../../recipes/kiso'

/**
 * Each kata writes its own palette strings, so nothing shared keeps them alike.
 * This test does: each string of a hue equals the string of the same job on
 * Button, which is the reference. A change to one shade thus fails here until
 * each kata that writes the shade agrees.
 *
 * The test compares the color classes only (not the focus ring), and it reads
 * a hover class with the gate of its kata taken off. A Button hover is gated on
 * the disabled states, and a Badge hover on `href`, but each paints the same
 * color.
 */

const HUE = new RegExp(`-(?:${[...colors, ...extendedColors].join('|')})-\\d`)

/** The state prefixes that differ between the kata, for the same hover. */
const GATES = /^(?:not-disabled:not-data-disabled:|\[&\[href\]\]:)/

type Variant = 'solid' | 'soft' | 'outline' | 'plain' | 'bare'

/** The color classes of a class value, sorted, with the gate of each hover taken off. */
function paint(value: ClassValue): string[] {
	return clsx(value)
		.split(' ')
		.filter((name) => HUE.test(name) && !name.includes('focus'))
		.map((name) => name.replace(GATES, ''))
		.sort()
}

/** The color classes of a Button in a variant and a color. */
function buttonPaint(variant: Variant, color: string): string[] {
	return paint(button({ variant, color: color as 'zinc' }).base)
}

/** The color classes of a Button with its hover classes taken off. */
function atRest(variant: Variant, color: string): string[] {
	return buttonPaint(variant, color).filter((name) => !name.includes('hover:'))
}

/** The hover classes of a Button, without the `hover:` prefix. */
function onHover(variant: Variant, color: string): string[] {
	return buttonPaint(variant, color)
		.filter((name) => name.startsWith('hover:'))
		.map((name) => name.replace('hover:', ''))
}

/** The classes of a Button at rest that start with `prefix` (`bg-`, `ring-`), in light and dark. */
function part(variant: Variant, color: string, prefix: string): string[] {
	return atRest(variant, color).filter((name) => name.replace('dark:', '').startsWith(prefix))
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

	// A hue as text on the page surface is the text of a bare Button at rest.
	describe('hue text matches a bare Button at rest', () => {
		it.each(colors)('Text and Link %s', (color) => {
			expect(paint(text.config.variants.color?.[color])).toEqual(atRest('bare', color))
			expect(paint(link.config.variants.color?.[color])).toEqual(atRest('bare', color))
		})

		it.each([
			['primary', 'blue'],
			['success', 'green'],
			['warning', 'amber'],
			['error', 'red'],
			['muted', 'zinc'],
		] as const)('iro.text.%s', (intent, color) => {
			expect(paint(iro.text[intent])).toEqual(atRest('bare', color))
		})

		it.each([
			['component', events.kind.component, 'sky'],
			['module', events.kind.module, 'violet'],
			['hash', events.hash, 'rose'],
			['password pass', passwordStrength.rule.icon.pass, 'green'],
		] as const)('%s', (_, value, color) => {
			expect(paint(value)).toEqual(atRest('bare', color))
		})
	})

	it('the current Calendar picker matches a soft blue Button', () => {
		expect(paint(calendar.picker.current)).toEqual(buttonPaint('soft', 'blue'))
	})

	// A PDF region takes the fill and the hover fill of a soft Button, and the
	// ring of an outline Button.
	describe('PdfViewer regions match Button', () => {
		const region = pdfViewer.viewport.page.highlights.region

		it.each(colors)('%s', (color) => {
			expect(paint(region.fill[color])).toEqual(part('soft', color, 'bg-'))
			expect(paint(region.active.fill[color])).toEqual(onHover('soft', color))
			expect(paint(region.ring[color])).toEqual(part('outline', color, 'ring-'))
		})
	})
})
