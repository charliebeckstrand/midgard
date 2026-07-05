import { describe, expect, it } from 'vitest'

import { k } from '../../recipes/kata/chart'
import { contrastRatio, readableInk, WCAG_AA_TEXT } from '../../utilities/contrast'
import { themeColor } from '../helpers/contrast'

/**
 * Drift guard for the chart segment-label ink (`kata/chart` `series[*].onFill`).
 *
 * A segment label sits on its slice's own fill, so its ink has to clear WCAG
 * text AA (4.5:1) against that fill. The rule is white-first: `white` wherever
 * white clears the floor, near-black `zinc-950` only where it can't. This
 * asserts every hue's authored pick, in both modes, is exactly what the
 * `readableInk` utility derives from Tailwind's own theme — so a shade or
 * palette edit that leaves a label unreadable, or that reaches for dark ink
 * where white would have held, fails here.
 */

const FLOOR = WCAG_AA_TEXT

const WHITE = 'white'
const DARK_INK = 'zinc-950'

const MODES = [
	{ name: 'light', index: 0 },
	{ name: 'dark', index: 1 },
] as const

const HUES = Object.keys(k.series) as (keyof typeof k.series)[]

/** The colour token behind a chart `fill-*` / `dark:fill-*` class, at `index` of its `[light, dark]` pair. */
function tokenAt(classes: readonly string[], index: number): string {
	const cls = classes[index]

	if (cls === undefined) throw new Error(`no class at index ${index}`)

	return cls.replace(/^dark:/, '').replace(/^fill-/, '')
}

/** A token → the value the contrast utility measures: the `white` keyword, else its theme oklch. */
function colorOf(token: string): string {
	return token === WHITE ? WHITE : themeColor(token)
}

describe('chart segment-label ink contrast', () => {
	for (const { name, index } of MODES) {
		describe(`${name} mode`, () => {
			it.each(HUES)('%s label clears text AA on its fill', (hue) => {
				const fill = colorOf(tokenAt(k.series[hue].fill, index))
				const ink = colorOf(tokenAt(k.series[hue].onFill, index))

				expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(FLOOR)
			})

			it.each(HUES)('%s takes the white-first ink readableInk derives', (hue) => {
				const fill = colorOf(tokenAt(k.series[hue].fill, index))
				const authored = tokenAt(k.series[hue].onFill, index)

				const picked = readableInk(fill, [WHITE, themeColor(DARK_INK)], FLOOR)

				expect(picked === WHITE ? WHITE : DARK_INK).toBe(authored)
			})
		})
	}
})
