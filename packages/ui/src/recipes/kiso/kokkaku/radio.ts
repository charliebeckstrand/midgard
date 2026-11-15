/**
 * Kokkaku skeleton: radio. A circle silhouette.
 *
 * The circle is the size of the real circle (`dan.size.check.box`). It is a
 * stepped `density-*` class, so the silhouette takes the step of its nearest
 * density scope, as the radio does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: radio
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

export const radio = {
	base: [rounded.full, dan.size.check.box],
	density: true,
} as const
