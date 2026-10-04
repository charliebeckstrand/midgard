/**
 * Kokkaku skeleton: tree. One icon and one label line per row. The row count
 * and the depth of each row come from the composing skeleton.
 *
 * `label` has the line height of each step of the text ramp of a row, so the
 * row has the height of a real row at its density step. `icon` has the icon
 * size of the step. The rows use the `labels` widths in turn. `first` and
 * `last` remove the outer padding of the edge rows, as the tree does for its
 * first and last top-level items.
 *
 * Layer: kiso · Concern: skeleton form · Unit: tree
 */

import { dan } from '../dan'
import { shaku } from '../shaku'

export const tree = {
	icon: ['flex-none', shaku.icon.base],
	label: `${dan.size.row} max-w-full`,
	labels: ['w-32', 'w-24', 'w-28', 'w-20'],
	first: 'pt-0',
	last: 'pb-0',
} as const
