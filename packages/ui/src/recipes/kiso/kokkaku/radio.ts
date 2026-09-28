/**
 * Kokkaku skeleton: radio. A circle silhouette.
 *
 * The size is a stepped `density-*` class, so the silhouette takes the step of
 * its nearest density scope, as the radio does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: radio
 */

import { kasane } from '../kasane'

const { rounded } = kasane

export const radio = {
	base: [rounded.full, 'density-size-[4,5,5]'],
	density: true,
} as const
