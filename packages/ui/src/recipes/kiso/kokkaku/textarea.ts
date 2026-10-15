/**
 * Kokkaku skeleton: textarea. Fills width. The caller puts a strut of a count
 * of lines (`lh`) in the silhouette, and the silhouette adds the vertical
 * padding of the textarea around the strut.
 *
 * `floor` is the minimum height of the border box of the textarea. The
 * Textarea kata reads it. The silhouette keeps the `border-box` of the preflight,
 * as the textarea does, so the same floor applies to the same box. Thus a
 * silhouette of one or two lines has the height of the real textarea.
 *
 * The padding, the radius, and the text are the ramps of the control density
 * (`dan.space.control.y`, `dan.radius.control`, and `ji.ramp`). The text sets
 * `lh`. So the silhouette takes the step of its nearest density scope, as the
 * textarea does. The `skeleton-parity` browser test holds the box at each step.
 *
 * Layer: kiso · Concern: skeleton form · Unit: textarea
 */

import { dan } from '../dan'
import { ji } from '../ji'

const floor = 'min-h-10'

export const textarea = {
	floor,
	base: ['w-full', 'h-auto', floor, dan.space.control.y, dan.radius.control, ji.ramp],
	/** The strut: a block of the caller's count of lines. */
	strut: 'block',
	density: true,
} as const
