/**
 * The `touch-pitch` utility: the pitch of a grid of hosts of a hit area
 * (`TouchTarget`) whose cells touch. The pitch is the distance from the center
 * of one cell to the center of the next. `ui/tailwind.css` loads this plugin
 * with `@plugin`.
 *
 * A hit area can only grow into free space. When the cells of a grid touch and
 * are smaller than the floor, a finger hits the next cell. On a fine pointer,
 * the utility sets each touch gap to zero, so each hit area keeps to its host.
 * On a coarse pointer, each row is at least 44 px tall: the coarse floor of
 * `TouchTarget`. Each host keeps its size in the middle of its cell, and each
 * touch gap goes back to the floor. So a host under the floor has a hit area of
 * 44 px, which fills a cell of 44 px. A host at the floor or over it keeps its
 * own box as its hit area.
 *
 * The container gives each column the floor. A grid with a fixed width gets it
 * from that width. A grid with no fixed width uses `minmax(2.75rem, 1fr)`, as
 * the month picker of a calendar does. A host in a column that is wider than
 * 44 px fills its column, so no space between two hit areas is dead.
 *
 * The `touch-pitch-row` utility is the pitch of a stack whose hosts are their
 * own hit areas, such as the rows of a list or of a tree. On a coarse pointer,
 * each host is at least 44 px tall.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { COARSE, FLOOR } from './floor'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addUtilities }) => {
	addUtilities({
		'.touch-pitch': {
			'--touch-target-gap-x': '0px',
			'--touch-target-gap-y': '0px',
			[COARSE]: {
				// `initial` makes each `var()` take its fallback: the floor.
				'--touch-target-gap-x': 'initial',
				'--touch-target-gap-y': 'initial',
				'grid-auto-rows': `minmax(${FLOOR}, auto)`,
				'place-items': 'center',
			},
		},
		// A host that is its own hit area, in a stack of hosts that touch, such
		// as a row of a list that acts. Its hit area is its box, so it cannot
		// grow past the next host. On a coarse pointer, the host takes the floor.
		'.touch-pitch-row': {
			[COARSE]: {
				'min-block-size': FLOOR,
			},
		},
	})
}
