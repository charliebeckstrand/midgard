/**
 * Kokkaku skeleton: checkbox. A box silhouette with the subtle rounded
 * corners of the real control.
 *
 * The size is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the checkbox does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: checkbox
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const checkbox = {
	base: [rounded.sm, 'density-size-[4,5,5]'],
	density: ['sm', 'md', 'lg'],
} as const
