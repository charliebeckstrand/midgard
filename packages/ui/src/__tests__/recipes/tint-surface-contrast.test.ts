// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { tintSurface } from '../../recipes/kiso/hannou/tint-surface'
import { contrastRatio, parseColor } from '../../utilities/contrast'
import { themeColor } from '../helpers/contrast'

/**
 * The hover step of an opaque surface is visible in both modes.
 *
 * `hannou.tintSurface` replaces the card fill with a nearby shade. On light, `zinc-50` on
 * white gave about 1.04:1, and a separated List row showed almost no change under the
 * pointer. The dark step, `zinc-800` on `zinc-900`, gives about 1.2:1. This guard sets the
 * floor between the two.
 */
const FLOOR = 1.08

const SURFACE = { light: 'white', dark: 'zinc-900' } as const

/** The color token of the `hover:bg-*` class for one mode. */
function hoverToken(mode: 'light' | 'dark'): string {
	const hover = tintSurface
		.flatMap((cls) => cls.split(' '))
		.filter((cls) => cls.startsWith('dark:') === (mode === 'dark'))
		.map((cls) => /hover:bg-([a-z]+(?:-\d{2,3})?)$/.exec(cls)?.[1])
		.find((token) => token !== undefined)

	if (!hover) throw new Error(`no ${mode} hover fill`)

	return hover
}

const color = (token: string) => parseColor(token === 'white' ? token : themeColor(token))

describe('hannou.tintSurface hover contrast', () => {
	for (const mode of ['light', 'dark'] as const) {
		it(`steps the ${mode} surface by at least ${FLOOR}:1`, () => {
			const ratio = contrastRatio(color(hoverToken(mode)), color(SURFACE[mode]))

			expect(ratio).toBeGreaterThanOrEqual(FLOOR)
		})
	}
})
