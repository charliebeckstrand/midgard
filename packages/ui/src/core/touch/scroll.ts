/**
 * The `touch-scroll` utility: the end of a scroll box whose content can put a
 * host of a hit area (`TouchTarget`) on its bottom edge. `ui/tailwind.css`
 * loads this plugin with `@plugin`.
 *
 * On a coarse pointer, the hit area of a host under the floor goes past the
 * host by half of the difference. The hit area is a box, so it is scrollable
 * overflow, and no CSS keeps a box out of it: `clip-path` does not, and a clip
 * that removes the overflow also removes the hit area. Thus a host on the
 * bottom edge of a scroll box with no padding made the box scroll by that
 * half. The scroll box also clips the hit area at its edge, so the part past
 * the edge was never a target.
 *
 * The utility gives the box a padding at the block end, of the reach of the
 * smallest host past its edge. The hit areas then stay in the box, whatever
 * the content is, and a component does not need to know that it is at the
 * edge of a scroll box. The smallest host is a control of the `sm` step,
 * 32 px high, the smallest step that a density scope takes. Thus the padding
 * is 6 px. A fine pointer keeps no padding.
 *
 * Put it on a scroll box that holds content of any kind with no padding of its
 * own, such as the content box of a dashboard tile. A box with a padding at the
 * block end of 6 px or more does not need it.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { COARSE, FLOOR } from './floor'

/** The height of the smallest host: a control of the `sm` step. */
const HOST = '2rem'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addUtilities }) => {
	addUtilities({
		'.touch-scroll': {
			[COARSE]: {
				'padding-block-end': `calc((${FLOOR} - ${HOST}) / 2)`,
			},
		},
	})
}
