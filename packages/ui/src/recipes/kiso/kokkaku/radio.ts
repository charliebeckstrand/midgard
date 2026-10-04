/**
 * Kokkaku skeleton: radio. A circle silhouette.
 *
 * `circle` is the size of the real circle. The Radio kata reads it. It is a
 * stepped `density-*` class, so the silhouette takes the step of its nearest
 * density scope, as the radio does.
 *
 * Layer: kiso · Concern: skeleton form · Unit: radio
 */

import { dan } from '../dan'
import { kasane } from '../kasane'

const { rounded } = kasane

const circle = dan.size.check.box

export const radio = {
	base: [rounded.full, circle],
	circle,
	density: true,
} as const
