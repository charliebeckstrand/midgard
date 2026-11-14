/**
 * Kokkaku skeleton: checkbox. A box silhouette with the subtle rounded
 * corners of the real control.
 *
 * `box` is the size of the real box. The Checkbox kata reads it. The box and
 * the radius are stepped `density-*` classes, so the silhouette takes the step
 * of its nearest density scope, as the checkbox does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: checkbox
 */

import { dan } from '../dan'

const box = dan.size.check.box

export const checkbox = {
	base: [dan.radius.check, box],
	box,
	density: true,
} as const
