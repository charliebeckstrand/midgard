/**
 * Kokkaku skeleton: textarea. Fills width. The caller sets the height as a
 * count of lines (`lh`), and the silhouette adds the vertical padding of the
 * textarea: `box-content` puts the padding outside that height.
 *
 * The padding, the radius, and the text are the stepped classes of the control
 * density axis (`kiso/control/density.ts`). The text sets `lh`. So the
 * silhouette takes the step of its nearest density scope, as the textarea
 * does. The `skeleton-parity` browser test holds the box at each step.
 *
 * Layer: kiso · Concern: skeleton form · Unit: textarea
 */

import { textRamp } from '../ji'

export const textarea = {
	base: [
		'w-full',
		'box-content',
		'density-py-ring-[1.5,2,2.5]',
		'density-rounded-[1.5,2,2.5]',
		textRamp,
	],
	density: true,
} as const
