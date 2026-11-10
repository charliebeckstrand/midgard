/**
 * Omote panel: the surface of a panel. Two shapes: chrome only (ring +
 * forced-color outline), and fill + chrome combined. And `axis`, the `surface`
 * axis of a modal panel.
 *
 * The `flat` half of the axis also holds the glass surface behind the
 * `surfaces-glass` variant. A server can paint an open modal panel before
 * hydration. It paints the `flat` half, and the Surfaces setting of the reader
 * is then only a class on the root (`core/surfaces/root.ts`). Thus that paint
 * is glass when the reader chose glass surfaces. After hydration, the panel
 * takes the `glass` half itself.
 *
 * Layer: kiso · Concern: panel surface
 */

import { mode } from '../../../core/recipe'

import { ring } from '../sen/ring'
import { bg } from './bg'
import { panelGlass } from './glass'

/** The `glass` surface behind the `surfaces-glass` variant: no fill, the blur of `panelGlass`, and its `--popover-alpha`. */
const glassBehind = [
	...mode(
		['surfaces-glass:bg-transparent', 'surfaces-glass:[--surface-fill:transparent]'],
		['dark:surfaces-glass:bg-transparent', 'dark:surfaces-glass:[--surface-fill:transparent]'],
	),
	'surfaces-glass:[--popover-alpha:100%]',
	'surfaces-glass:backdrop-blur-lg',
]

export const panel = {
	/** Chrome only: ring + forced-color outline, no fill. */
	chrome: ring.default,
	/** Fill + chrome, everything a floating panel needs. */
	base: [...ring.default, ...bg.surface],
	/** The `surface` axis of a modal panel: `flat` is opaque, and `glass` is translucent and blurred. */
	axis: { glass: panelGlass, flat: [...bg.surface, ...glassBehind] },
} as const
