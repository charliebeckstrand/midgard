// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { k } from '../../recipes/kata/chart'
import { contrastRatio, WCAG_AA_TEXT } from '../../utilities/contrast'
import { themeColor } from '../helpers/contrast'

/**
 * Guard for the chart label ink (`kata/chart` `series[*].ink`).
 *
 * A value label and a reference label are text on the chart surface, in the
 * color of their series or rule. A category reference has no legend chip, so
 * its label is its one visible name. The ink therefore clears the 4.5:1 text
 * floor (WCAG 1.4.3) on each surface that a chart sits on: white in light mode,
 * and the zinc-900 card or the zinc-950 page in dark mode (`omote` `bg.surface`,
 * `zu` `ink.surface`). A shade edit that leaves a label under that floor fails
 * here.
 */

const MODES = [
	{ name: 'light', index: 0, surfaces: ['#ffffff'] },
	{ name: 'dark', index: 1, surfaces: ['zinc-900', 'zinc-950'] },
] as const

const HUES = Object.keys(k.series) as (keyof typeof k.series)[]

/** The color token behind a `fill-*` / `dark:fill-*` class, at `index` of its `[light, dark]` pair. */
function tokenAt(classes: readonly string[], index: number): string {
	const className = classes[index]

	if (className === undefined) throw new Error(`no class at index ${index}`)

	return className.replace(/^dark:/, '').replace(/^fill-/, '')
}

/** A surface → the value the contrast utility measures: a hex as it is, else its theme oklch. */
function surfaceColor(surface: string): string {
	return surface.startsWith('#') ? surface : themeColor(surface)
}

describe('chart label ink contrast', () => {
	for (const { name, index, surfaces } of MODES) {
		describe(`${name} mode`, () => {
			it.each(HUES.flatMap((hue) => surfaces.map((surface) => [hue, surface] as const)))(
				'%s ink clears the 4.5:1 text floor on %s',
				(hue, surface) => {
					const ink = themeColor(tokenAt(k.series[hue].ink, index))

					expect(contrastRatio(ink, surfaceColor(surface))).toBeGreaterThanOrEqual(WCAG_AA_TEXT)
				},
			)

			it.each(HUES)('%s ink keeps the hue of its fill', (hue) => {
				const toHue = (token: string) => token.replace(/-\d+$/, '')

				expect(toHue(tokenAt(k.series[hue].ink, index))).toBe(
					toHue(tokenAt(k.series[hue].fill, index)),
				)
			})
		})
	}
})
