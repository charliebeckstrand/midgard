/**
 * Omote rail: a box that scrolls on the inline axis. It is the one home of a
 * horizontal scroll container in `ui`, so each such scroller shows the same
 * overflow indicator.
 *
 * While the content overflows, the edge with more content behind it fades
 * ({@link fade}). The fade is CSS only, so the first paint shows it. The
 * `min-w-0` lets a flex child overflow at all, and the scroll does not chain to
 * the page. A scroll on one axis makes the other axis `auto`, so the rail sets
 * the block axis to `hidden`. Thus a small vertical overflow, such as a
 * fraction of a pixel from the font metrics, does not let the rail scroll
 * vertically. A rail that is a tab stop shows an inset ring, because the scroll
 * clips an outset ring.
 *
 * Put the rail on a box with no border and no fill. The fade masks the whole
 * box, so it also fades a border or a fill at the edge.
 *
 * Layer: kiso · Concern: inline scroll container
 */

import { sen } from '../sen'

import { fade } from './fade'

export const rail = [
	'min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain',
	...fade.inline,
	...sen.focus.inset,
] as const
