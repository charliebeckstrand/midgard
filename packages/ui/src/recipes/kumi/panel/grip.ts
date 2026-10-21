/**
 * Panel group: the drag grip. Drawer and Sheet share it.
 *
 * Layer: kumi · Group: panel · Concern: grip
 */

import { mode } from '../../../core/recipe'
import { hannou } from '../../kiso'

/**
 * The stroke the grip takes when a reader tabs to it.
 *
 * On the bar rather than on the area that holds it. The area is the reach: the
 * drawer's whole width, the sheet's whole height. A ring drawn around that
 * is a line across the panel that says nothing about what has focus. The bar is
 * the control the reader sees and aims at, so it is the thing to outline.
 *
 * Gated on the area's focus, because the area holds the tab stop and the bar is
 * its `::after`. A CSS outline rather than a ring, for the reason `sen.focus.ring`
 * gives. That is one crisp stroke along the radius, with a transparent offset gap
 * that keeps it legible against the panel's own fill.
 */
const FOCUS = [
	'focus-visible:after:outline-2 focus-visible:after:outline-offset-2',
	'focus-visible:after:outline-blue-600',
]

/**
 * The grip's own look, which is the same bar whichever way it lies. Forced colors
 * remove the background of the bar, so the bar paints in `CanvasText`, as
 * `sen.forced.shape` does for an element.
 */
const BAR = [
	'after:rounded-full',
	...mode('after:bg-zinc-950/20', 'dark:after:bg-white/25'),
	'forced-colors:after:bg-[CanvasText]',
	...FOCUS,
]

export const grip = {
	/**
	 * The grab area that holds the bar and the tab stop. It centers the bar, and
	 * `hannou.grab.default` carries the rest, including the `touch-none` that
	 * makes the gesture work at all under a finger. The stroke goes on the bar
	 * (see `FOCUS`), so the area suppresses the browser's own, which would draw
	 * around the whole reach.
	 */
	area: ['items-center justify-center', ...hannou.grab.default, 'outline-hidden'],
	/**
	 * The bar the reader sees and aims at, which the grab area draws as its
	 * `::after`. It is keyed by the line the separator draws. That is the same
	 * word its `aria-orientation` says, and not the axis it resizes. A grip
	 * standing on the inner edge of a right-hand sheet is vertical and moves the
	 * width.
	 */
	bar: {
		horizontal: ['after:h-1.5 after:w-10', ...BAR],
		vertical: ['after:h-10 after:w-1.5', ...BAR],
	},
} as const
