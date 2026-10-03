/**
 * Kokkaku skeleton: timeline. One marker dot, one title line, and one
 * timestamp line per item. The item count comes from the composing skeleton.
 *
 * The marker dot fills the real marker box. The title line has the line
 * height of the title text at each density step, and the timestamp line has
 * the line height of the timestamp text. The item spacing, the marker box, and
 * the place of each line come from the real timeline recipes, so the
 * silhouette takes the step of its nearest density scope, as the timeline
 * does. The widths are defaults, and the lines do not go wider than the item.
 *
 * Layer: kiso · Concern: skeleton form · Unit: timeline
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const timeline = {
	dot: rounded.full,
	title: 'density-h-[6,7,7] w-40 max-w-full',
	timestamp: 'density-h-[4,5,6] w-20 max-w-full',
} as const
