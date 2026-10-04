/**
 * Omote rail: a box that scrolls on the inline axis. It is the one home of a
 * horizontal scroll container in `ui`, so each such scroller shows the same
 * overflow indicator.
 *
 * While the content overflows, the edge with more content behind it fades
 * ({@link fade}). The fade shows only while the attributes that
 * `useScrollOverflow({ axis: 'horizontal' })` stamps are present, so the
 * component that reads the rail must also call that hook. The `min-w-0` lets a flex child
 * overflow at all, and the scroll does not chain to the page. A rail that is a
 * tab stop shows an inset ring, because the scroll clips an outset ring.
 *
 * Put the rail on a box with no border and no fill. The fade masks the whole
 * box, so it also fades a border or a fill at the edge.
 *
 * Layer: kiso · Concern: inline scroll container
 */

import { sen } from '../sen'

import { fade } from './fade'

export const rail = [
	'min-w-0 overflow-x-auto overscroll-x-contain',
	...fade.inline,
	...sen.focus.inset,
] as const
