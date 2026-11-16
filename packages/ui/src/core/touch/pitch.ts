/**
 * The `touch-pitch-x`, `touch-pitch-y`, and `touch-pitch` utilities: the
 * pitch of a set of hosts of a hit area (`TouchTarget`) that touch. The pitch
 * is the distance from the center of one host to the center of the next.
 * `ui/tailwind.css` loads this plugin with `@plugin`.
 *
 * A hit area can only grow into free space. When hosts touch, the touch gap
 * keeps each hit area to its host, so two hit areas do not overlap. But a
 * finger then hits the next host when the hosts are smaller than the floor. On
 * a coarse pointer, each utility gives each child of the container a minimum
 * size of 44 px on its axis: the coarse floor of `TouchTarget`. On each
 * pointer, it sets the touch gap of that axis to zero, so the hit areas tile
 * the set. A fine pointer keeps the size of each host.
 *
 * Use a pitch utility for a set of hosts that touch, such as the days of a
 * calendar. Use a touch gap utility (`core/touch/gap.ts`) for a set of hosts
 * with a gap between them. A container with a fixed size must also give room
 * for the floor: a grid of 7 columns needs 7 × 44 px on a coarse pointer. A
 * grid with no fixed width gives each column the floor
 * (`minmax(2.75rem, 1fr)`), because the minimum size of a child does not widen
 * a flexible column.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/** The coarse floor of `TouchTarget`, which takes the same value. */
const FLOOR = '2.75rem'

/** The media query of a coarse pointer, as the `pointer-coarse` variant writes it. */
const COARSE = '@media (pointer: coarse)'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addUtilities }) => {
	addUtilities({
		'.touch-pitch-x': {
			'--touch-target-gap-x': '0px',
			[COARSE]: { '& > *': { 'min-inline-size': FLOOR } },
		},
		'.touch-pitch-y': {
			'--touch-target-gap-y': '0px',
			[COARSE]: { '& > *': { 'min-block-size': FLOOR } },
		},
		'.touch-pitch': {
			'--touch-target-gap-x': '0px',
			'--touch-target-gap-y': '0px',
			[COARSE]: { '& > *': { 'min-inline-size': FLOOR, 'min-block-size': FLOOR } },
		},
	})
}
