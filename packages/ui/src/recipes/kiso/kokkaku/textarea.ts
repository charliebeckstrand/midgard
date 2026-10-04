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

import { py, radius } from '../control/density'
import { ji } from '../ji'

export const textarea = {
	base: ['w-full', 'box-content', py, radius, ji.ramp],
	density: true,
} as const
