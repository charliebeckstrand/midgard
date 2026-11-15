/**
 * Kokkaku skeleton: checkbox. A box silhouette with the subtle rounded
 * corners of the real control.
 *
 * The box and the radius are the ramps of the real box (`dan.size.check.box`
 * and `dan.radius.check`). They are stepped `density-*` classes, so the silhouette takes the step
 * of its nearest density scope, as the checkbox does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: checkbox
 */

import { dan } from '../dan'

export const checkbox = {
	base: [dan.radius.check, dan.size.check.box],
	density: true,
} as const
