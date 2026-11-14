/**
 * Omote panel: `axis`, the `surface` axis of a modal panel. The chrome of a
 * panel is `sen.ring.default`, and its opaque fill is `omote.bg.surface`.
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
	/** The `surface` axis of a modal panel: `flat` is opaque, and `glass` is translucent and blurred. */
	axis: { glass: panelGlass, flat: [...bg.surface, ...glassBehind] },
} as const
