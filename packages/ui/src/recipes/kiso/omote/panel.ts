/**
 * Omote panel: the surface of a panel. Two shapes: chrome only (ring +
 * forced-color outline), and fill + chrome combined. And `axis`, the `surface`
 * axis of a modal panel.
 *
 * The `glass` half of the axis also holds the flat surface behind the
 * `surfaces-solid` variant. A server can paint an open modal panel before
 * hydration, and the Surfaces setting of the reader is then only a class on
 * the root (`core/surfaces/root.ts`). Thus that paint is flat when the reader chose
 * solid surfaces. After hydration, the panel takes the `flat` half itself.
 *
 * Layer: kiso · Concern: panel surface
 */

import { mode } from '../../../core/recipe'

import { ring } from '../sen/ring'
import { bg } from './bg'
import { glass } from './glass'

/** The `flat` surface behind the `surfaces-solid` variant: the fill of `bg.surface`, and no blur. */
const solid = [
	...mode(
		['surfaces-solid:bg-white', 'surfaces-solid:[--surface-fill:var(--color-white)]'],
		[
			'dark:surfaces-solid:bg-zinc-900',
			'dark:surfaces-solid:[--surface-fill:var(--color-zinc-900)]',
		],
	),
	'surfaces-solid:backdrop-blur-none',
]

export const panel = {
	/** Chrome only: ring + forced-color outline, no fill. */
	chrome: ring.default,
	/** Fill + chrome, everything a floating panel needs. */
	base: [...ring.default, ...bg.surface],
	/** The `surface` axis of a modal panel: `flat` is opaque, and `glass` is translucent and blurred. */
	axis: { glass: [...glass, ...solid], flat: bg.surface },
} as const
